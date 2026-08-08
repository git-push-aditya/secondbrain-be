import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import handleError from '../utils/handleErrors';
import { generateHash } from '../utils/generateHash';
import client from '../prismaClient';
import { Pinecone } from '@pinecone-database/pinecone';
import { embedContent } from '../worker/worker';
import { getUserLists } from '../utils/userLists';

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_VDB_API_KEY || ''
});

const store = pinecone.index('secondbrain');


interface AddContentType {
    title: string,
    hyperlink: string,
    note: string | null,
    type: 'WEB' | 'REDDIT' | 'TWITTER' | 'YOUTUBE' | 'INSTAGRAM',
    existingTags: string[],
    newTags: string[],
    userId: number,
    collectionId: number
}


interface fetchUserId {
    userId: number,
    collectionId: number,
    page: number,
    limit: number,
    hash: string
}

interface taggedContent {
    tags: string[],
    userId: number,
    union: boolean
}

interface returningContent {
    id: number,
    title: string,
    hyperlink: string,
    note: string | null,
    createdAt: Date | null,
    type: 'WEB' | 'YOUTUBE' | 'TWITTER' | 'REDDIT' | 'INSTAGRAM',
    userId: number,
    tags: string[]
}



export const addContent = async (req: Request<{}, {}, AddContentType>, res: Response) => {

    try {
        const { title, hyperlink, note, type, existingTags, newTags, userId, collectionId } = req.body;
        const allTags = Array.from(new Set([...existingTags, ...newTags]));

        const collectionCheck = await client.collection.findFirst({
            where: { id: collectionId, userId },
            select: { id: true }
        });

        if (!collectionCheck) {
            res.status(403).json({
                status: "failure",
                payload: {
                    message: "unAutherized access"
                }
            })
            return;
        }

        //duplicate-in-collection is enforced by content's (collectionId, hyperlink) unique index - race-free
        //without needing our own lock, since Postgres rejects the second concurrent insert outright (P2002 below)
        const newContent = await client.content.create({
            data: {
                title, hyperlink, note, type, userId, collectionId,
                tags: allTags.length !== 0 ? {
                    create: allTags.map((tagTitle) => ({
                        tag: { connectOrCreate: { where: { title: tagTitle }, create: { title: tagTitle } } }
                    }))
                } : undefined
            },
            select: {
                id: true, title: true, hyperlink: true, note: true, createdAt: true, type: true,
                tags: { select: { tag: { select: { id: true, title: true } } } }
            }
        });

        const tagsList = newContent.tags.map((t) => t.tag);
        const enrichedContent = { ...newContent, tags: tagsList, userId };

        res.status(200).json({
            status: "success",
            payload: {
                message: "Content created successfully",
                content: enrichedContent
            }
        })

        //fire-and-forget: scrape + embed happens after the response is sent, no queue/worker needed
        embedContent({ card: enrichedContent, type: enrichedContent.type }).catch((e) => {
            console.error('Error embedding content in background', e);
        });

    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            console.log('user is trying to enter same link in the same collection multiple times');
            res.status(400).json({
                status: "failure",
                payload: {
                    message: "Duplicate entry by user"
                }
            })
            return;
        }

        handleError(e, res);
    }
}






export const deleteContent = async (req: Request, res: Response) => {
    const { userId, contentId } = req.body;

    try {
        const deletedPost = await client.content.delete({
            where: { id: contentId },
            select: { id: true }
        })


        await store._deleteOne(`${contentId}`); 

        res.status(200).json({
            status: "success",
            payload: {
                message: "Content deleted successfully",
                contentId: deletedPost.id
            }
        })

    } catch (e) {
        handleError(e, res);
    } finally {
        return;
    }
}





export const fetchContent = async (req: Request<{}, {}, fetchUserId>, res: Response) => {

    const { userId } = req.body;
    const collectionId = parseInt(req.query.collectionId as string);
    const limit = parseInt(req.query.limit as string);
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    try {

        /* Filters content.userId directly rather than through `collection: { userId }` - the
           relation filter forced a join to collection on every page, and content already
           carries userId (indexed). Ownership is still enforced: a collection belonging to
           someone else matches no rows. */
        const contentRows = await client.content.findMany({
            where: {
                collectionId,
                userId
            },
            skip,
            //one extra row is a cheaper "is there a next page" than a full count() over the
            //collection, which previously ran on every single page request
            take: limit + 1,
            select: {
                id: true,
                title: true,
                hyperlink: true,
                note: true,
                createdAt: true,
                type: true,
                tags: {
                    select: {
                        tag: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        const more = contentRows.length > limit;
        const pageRows = more ? contentRows.slice(0, limit) : contentRows;

        //shape kept identical to the old contentCollection-joined response ({collectionId, content} per row)
        //so the frontend doesn't need to change
        const content = pageRows.map((row) => ({ collectionId, content: row }));

        res.status(200).json({
            status: "success",
            payload: {
                message: content.length === 0 ? "No content found" : "Contents found",
                content,//data is in content.content
                more
            }
        })



    } catch (e) {
        handleError(e, res);
    } finally {
        return;
    }

}




export const generateSharableLink = async (req: Request<{}, {}, fetchUserId>, res: Response) => {
    const { userId, collectionId } = req.body;

    try {
        const check = await client.link.findFirst({
            where: {
                userId: userId,
                collectionId: collectionId
            },
            select: {
                hash: true
            }
        });

        if (check === null) {

            const hash = generateHash();

            await Promise.all([
                client.link.create({
                    data: {
                        userId: userId,
                        hash: hash,
                        collectionId: collectionId
                    }
                }),

                client.collection.update({
                    where: {
                        id: collectionId
                    },
                    data: {
                        shared: true
                    }
                })
            ]);
 
            const generatedLink: string = `https://secondbrain.notaditya.dev/sharedbrain/?id=${hash}`;

            res.status(200).json({
                status: "success",
                payload: {
                    message: "Your brain is ready to be shared",
                    generatedLink
                }
            })

        } else {
            const generatedLink: string = `https://secondbrain.notaditya.dev/sharedbrain/?id=${check?.hash}`;
            res.status(200).json({
                status: "success",
                payload: {
                    message: "Shareable link already present",
                    generatedLink
                }
            })
        }

    } catch (e) {
        handleError(e, res);
    } finally {
        return;
    }
}



//initial fetch that gets metadata
export const sharedContent = async (req: Request, res: Response) => {
    const requestHash = req.query.id as string;
    try {
        const shareExist = await client.link.findFirst({
            where: {
                hash: requestHash
            }, select: {
                collection: {
                    select: {
                        name: true,
                        desc: true
                    }
                },
                user: {
                    select: {
                        userName: true,
                        profilePic: true
                    }
                }
            }
        })

        if (shareExist !== null) {


            res.status(200).json({
                status: "success",
                payload: {
                    message: "Collection is shared// sending metadat",
                    userName: shareExist.user.userName,
                    collectionName: shareExist.collection.name,
                    collectionDesc: shareExist.collection.desc,
                    userProfilePic: shareExist.user.profilePic
                }
            })


        } else {
            res.status(404).json({
                status: "failure",
                payload: {
                    message: "Link does not exist !! Either you have wrong link or the user doent share his brain anymore"
                }
            })
        }

    } catch (e) {
        handleError(e, res);
    } finally {
        return;
    }
}



//to actually fetch userdata in shared page
export const pagedSharedConetnt = async (req: Request, res: Response) => {
    const hash = req.query.hash as string;
    const page = req.query.page as string;
    const limit = req.query.limit as string;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const collectionId = await client.link.findFirst({
        where: { hash },
        select: { collectionId: true }
    });

    if (collectionId === null) {
        console.error("unauthorized access")
        res.status(400).json({
            status: "failure",
            payload: {
                message: "No shared collection exist"
            }
        });
        return;
    }
    try {  //more field in the return which
        const [count, contentRows] = await Promise.all([
            client.content.count({
                where: {
                    collectionId: collectionId.collectionId
                }
            }),

            client.content.findMany({
                where: {
                    collectionId: collectionId.collectionId,
                    collection: { shared: true }
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    hyperlink: true,
                    createdAt: true,
                    note: true,
                    type: true,
                    tags: {
                        select: {
                            tag: {
                                select: {
                                    id: true,
                                    title: true
                                }
                            }
                        }
                    }
                }
            })
        ]);

        //shape kept identical to the old contentCollection-joined response ({collectionId, content} per row)
        const paginatedSharedData = contentRows.map((row) => ({ collectionId: collectionId.collectionId, content: row }));

        res.status(200).json({
            status: "success",
            payload: {
                message: "fetched content successfully",
                content: paginatedSharedData,
                more: parseInt(page) * parseInt(limit) < count
            }
        })
    } catch (e) {
        console.error("some error occured", e);
        handleError(e, res);
    }
    return;
}

//only change i want ot make is it returns collection name
export const fetchTaggedContent = async (req: Request<{}, {}, taggedContent>, res: Response) => {

    const { tags, userId, union } = req.body;
    try {
        const tagIdArr = await client.tags.findMany({
            where: {
                title: {
                    in: tags
                }
            }, select: {
                id: true,
                title: true
            }
        })

        const tagIdArray: number[] = tagIdArr.map((tag) => tag.id);

        if (tagIdArray.length !== 0) {
            const taggedContent = await client.contentTags.findMany({
                where: {
                    AND: [{
                        content: {
                            userId: userId
                        }
                    }, {
                        tagId: {
                            in: tagIdArray
                        }
                    }]
                },
                select: {
                    tag: {
                        select: {
                            title: true
                        }
                    },
                    content: {
                        select: {
                            title: true,
                            note: true,
                            hyperlink: true,
                            createdAt: true,
                            userId: true,
                            id: true,
                            type: true
                        }
                    }
                },
                orderBy: {
                    tagId: "desc"
                }
            })

            let refinedContent: returningContent[] = [];

            if (taggedContent.length != 0) {


                const contentMap = new Map<number, returningContent>();

                taggedContent.forEach((contentEl) => {
                    const existingContent = contentMap.get(contentEl.content.id);
                    if (existingContent) {
                        existingContent.tags.push(contentEl.tag.title);
                    } else {
                        contentMap.set(contentEl.content.id, {
                            id: contentEl.content.id,
                            title: contentEl.content.title,
                            hyperlink: contentEl.content.hyperlink,
                            note: contentEl.content.note,
                            createdAt: contentEl.content.createdAt,
                            type: contentEl.content.type,
                            userId: contentEl.content.userId,
                            tags: [contentEl.tag.title]
                        })
                    }
                });

                refinedContent = Array.from(contentMap.values());
            }


            if (union) { //union means give all the contetnd even if it contains only single tag belongin to hte users list
                if (refinedContent.length === 0) {
                    res.status(204).json({
                        status: "success",
                        payload: {
                            message: "No content found for the given tags",
                            taggedContent: []
                        }

                    })
                } else {
                    res.status(200).json({
                        status: "success",
                        payload: {
                            message: "Content fetched successfuly",
                            taggedContetn: refinedContent
                        }

                    })
                }
            } else {//!union or intersection means give only content who have all of those tags requested by user
                const intersectedContent: returningContent[] = refinedContent.filter((contentEl) =>
                    tags.every((tag) => contentEl.tags.includes(tag))
                );

                if (intersectedContent.length === 0) {
                    res.status(204).json({
                        status: "success",
                        payload: {
                            message: "No content found for the given tags",
                            taggedContent: []
                        }
                    })
                } else {
                    res.status(200).json({
                        status: "success",
                        payload: {
                            message: "Content fetched successfuly",
                            taggedContent: intersectedContent
                        }
                    })
                }
            }
            return;
        }
        res.status(404).json({
            status: "failure",
            payload: {
                message: "No such tags exist"
            }
        })

    } catch (e) {
        handleError(e, res);
    } finally {
        return;
    }
}


export const deleteSharedLink = async (req: Request<{}, {}, fetchUserId>, res: Response) => {
    const { userId, collectionId } = req.body;
    try {
        await client.$transaction([
            client.link.delete({
                where: {
                    userId: userId,
                    collectionId: collectionId
                }
            }),

            client.collection.update({
                where: {
                    id: collectionId
                },
                data: {
                    shared: false
                }
            })
        ]);

        res.status(200).json({
            status: "success",
            payload: {
                message: "shared link deleted successfully"
            }
        })
    } catch (e) {
        handleError(e, res);
    } finally {
        return;
    }
}


export const newCollection = async (req: Request<{}, {}, { userId: number, collectionName: string, collectionDesc: string }>, res: Response) => {
    const { userId, collectionName, collectionDesc } = req.body;

    try {
        const newCollection = await client.collection.create({
            data: {
                name: collectionName,
                userId: userId,
                desc: collectionDesc
            }, select: {
                id: true,
                name: true
            }
        })

        res.status(200).json({
            status: "success",
            payload: {
                message: " Collection created successfully ",
                collectionId: newCollection.id,
                collectionName: newCollection.name
            }
        })


    } catch (e) {
        console.error("Error creating new collection for the user ");
        res.status(500).json({
            status: "failure",
            payload: {
                message: " Internal server error "
            }
        })
    }
}







export const getCommCollList = async (req: Request, res: Response) => {

    const { userId } = req.body;

    try {
        //same payload the auth responses now embed - see utils/userLists
        const { tagsList, collectionList, allCommunities } = await getUserLists(userId);

        res.status(200).json({
            status: "success",
            payload: {
                message: "got collection, tab and communitylist",
                tagsList,
                collectionList,
                allCommunities
            }
        })
    } catch (e) {
        console.error('errro getting data');
        res.status(400).json({
            status: "failure",
            payload: {
                message: "internal server error"
            }
        })
    }

}


export const deleteCollection = async (req: Request, res: Response) => {
    const { collectionId } = req.body;
    const ifDashboard = await client.collection.findFirst({
        where: {
            id: collectionId
        }, select: {
            name: true
        }
    })

    if (!ifDashboard === null || ifDashboard?.name === 'dashboard') {
        res.status(400).json({
            status: 'failure',
            payload: {
                message: "Cannot delete dashboard"
            }
        })
        return;
    }
    try {
        //content.collectionId has onDelete: Cascade, so deleting the collection deletes its content
        //in the same statement - no need to find and delete content separately first
        const deletedDashboard = await client.collection.delete({
            where: {
                id: collectionId
            },
            select: {
                id: true
            }
        });


        res.status(200).json({
            status: "success",
            payload: {
                message: "Collection and its contetn deleted successfull",
                deletedId: deletedDashboard.id
            }
        })
    } catch (e) {
        console.error('Error deleting the collection ', e);
        handleError(e, res);
    }
}