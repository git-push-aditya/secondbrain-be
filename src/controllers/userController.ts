import { Request, Response } from 'express';
import handleError from '../utils/handleErrors';
import { generateHash } from '../utils/generateHash';
import client from '../prismaClient';
import { Pinecone } from '@pinecone-database/pinecone';
import redisClient from '../server';

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

        const ifExist = await client.contentCollection.findFirst({
            where: {
                collection: {
                    is: {
                        id: collectionId,
                        userId: userId
                    }
                },
                content: {
                    is: {
                        hyperlink
                    }
                }
            },
            select: {
                contentId: true
            }
        })

        if (ifExist && ifExist.contentId) {
            console.log('user is trying to enter same link in the same collection multiple times');
            res.status(400).json({
                status: "failure",
                payload: {
                    message: "Duplicate entry by user"
                }
            })
            return;
        }



        //new tags added
        let filteredNewTags: string[] = newTags.filter((tag) => !existingTags.includes(tag));

        //old tags fetched
        let oldTags: { id: number, title: string }[] = [];

        if (existingTags.length != 0) {
            const oldTagsIdList = await client.tags.findMany({
                where: {
                    title: {
                        in: existingTags
                    }
                },
                select: {
                    title: true,
                    id: true
                }
            })

            oldTags = oldTagsIdList;
        }

        filteredNewTags = filteredNewTags
            .filter((tag) => !oldTags.some((oldTag) => oldTag.title === tag));

        let newtag: { id: number, title: string }[] = [];


        const { newContent, tagsList } = await client.$transaction(async (tx) => {

            if (filteredNewTags.length != 0) {
                const newTagsUpload = await tx.tags.createManyAndReturn({
                    data: filteredNewTags.map((tag) => ({
                        title: tag
                    })),
                    select: {
                        id: true,
                        title: true
                    }
                });
                newtag = newTagsUpload;
            }

            //new content created
            const newContent = await tx.content.create({
                data: { title, hyperlink, note, type, userId },
                select: { id: true, title: true, hyperlink: true, note: true, createdAt: true, type: true },
            });

            //entry made in contetn collection table to map contetn to particular collection
            await tx.contentCollection.create({
                data: {
                    collectionId: collectionId,
                    contentId: newContent.id
                }
            })

            const tagsList: { id: number, title: string }[] = Array.from(new Set([...newtag, ...oldTags]));

            if (tagsList.length != 0) {
                await tx.contentTags.createMany({
                    data: tagsList.map((tag) => ({
                        contentId: newContent.id,
                        tagId: tag.id
                    }))
                })
            }

            return { newContent, tagsList };

        })

        const enrichedContent = { ...newContent, tags: tagsList, userId };
        await redisClient.lPush('embedQueue', JSON.stringify(enrichedContent));


        res.status(200).json({
            status: "success",
            payload: {
                message: "Content created successfully",
                content: enrichedContent
            }
        })

    } catch (e) {
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
        console.log(deletedPost);

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

        const [count, content] = await Promise.all([
            client.contentCollection.count({
                where: {
                    collection: {
                        is: {
                            userId
                        }
                    },
                    collectionId: collectionId
                }
            }),

            client.contentCollection.findMany({
                where: {
                    collection: {
                        is: {
                            userId
                        }
                    },
                    collectionId: collectionId,
                },
                skip,
                take: limit,
                select: {
                    collectionId: true,
                    content: {
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
                        }
                    }
                },
                orderBy: {
                    content: {
                        createdAt: "desc"
                    }
                }
            })
        ]);




        res.status(200).json({
            status: "success",
            payload: {
                message: content.length === 0 ? "No content found" : "Contents found",
                content,//data is in content.content
                more: page * limit < count
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


            const generatedLink: string = `http://localhost:5173/sharedbrain/?id=${hash}`;

            res.status(200).json({
                status: "success",
                payload: {
                    message: "Your brain is ready to be shared",
                    generatedLink
                }
            })

        } else {
            const generatedLink: string = `http://localhost:5173/sharedbrain/?id=${check?.hash}`;
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
        const [count, paginatedSharedData] = await Promise.all([
            client.contentCollection.count({
                where: {
                    collectionId: collectionId.collectionId
                }
            }),

            client.contentCollection.findMany({
                where: {
                    collectionId: collectionId.collectionId,
                    collection: {
                        is: {
                            shared: true
                        }
                    }
                },
                skip,
                take: parseInt(limit),
                orderBy: [{ content: { createdAt: "desc" } }],
                select: {
                    collectionId: true,
                    content: {
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
                    }
                }
            })
        ]);

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
    console.log("reached");
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
        const [collectionList, tagsList, communitylist] = await Promise.all([
            client.collection.findMany({
                where: {
                    userId: userId
                },
                select: {
                    id: true,
                    name: true,
                    shared: true
                }
            }),

            client.tags.findMany({
                select: {
                    title: true
                }
            }),

            client.user.findMany({
                where: {
                    id: userId
                },
                select: {
                    founded: {
                        select: {
                            name: true,
                            id: true
                        }
                    },
                    memberOf: {
                        select: {
                            community: {
                                select: {
                                    name: true,
                                    id: true
                                }
                            }
                        }
                    }
                }
            })
        ])



        const list = communitylist[0];
        const founded = (list.founded || []).map(community => ({
            id: community.id,
            name: community.name,
            isFounder: true
        }));
        const memberOf = (list.memberOf || []).map(community => ({
            id: community.community.id,
            name: community.community.name,
            isFounder: false
        }));

        const allCommunities = [...founded, ...memberOf];


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
    try {////made changes her
        const deletedDashboard = await client.$transaction(async (tx) => {
            const contentToDelete = await tx.content.findMany({
                where: {
                    collection: {
                        is: {
                            collectionId: collectionId,
                        },
                    },
                },
                select: { id: true }
            });

            if (contentToDelete.length > 0) {
                await tx.content.deleteMany({
                    where: {
                        id: { in: contentToDelete.map(c => c.id) }
                    }
                });
            }

            return tx.collection.delete({
                where: {
                    id: collectionId
                },
                select: {
                    id: true
                }
            });
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