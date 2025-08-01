import { Request, Response } from "express";
import { generateHash } from "../utils/generateHash";
import client from "../prismaClient";
import bcrypt from 'bcrypt'; 
import handleError from "../utils/handleErrors"; 

export const createCommunity = async (req: Request, res: Response) => {

    try {
        const { userId, name, descp, emailLead, membersCanPost, password } = req.body;

        const hash = generateHash();

        const hashedPassword = await bcrypt.hash(password.trim(), 10)

        const createdCommunity = await client.community.create({
            data: {
                hash,
                name,
                descp,
                emailLead,
                membersCanPost,
                password: hashedPassword,
                founderId: userId
            }
        })

        const community = `secondbrain:${name}@${hash}`;

        res.json({
            status: "success",
            payload: {
                message: "community created successfully",
                community,
                communityId: createdCommunity.id,
                password: password.trim()
            }
        })
    } catch (e) {
        console.error("Some error occured\n\n");
        console.error(e);
        res.status(400).json({
            status: "failure",
            payload: {
                message: " server error creating a community. Retry later."
            }
        })
    }
}


export const joinCommunity = async (req: Request, res: Response) => {
    try {
        const { communityId, userId } = req.body;
        const hash = communityId.trim().split('@')[1];
        const communityCred = await client.community.findFirst({
            where: {
                hash
            }, select: {
                name: true,
                id: true,
                descp: true,
                membersCanPost: true,
                founder: {
                    select: {
                        id: true,
                        userName: true
                    }
                }
            }
        })

        if (communityCred === null) {
            res.status(404).json({
                status: "failure",
                payload: {
                    message: "community doesnt exist"
                }
            })
            return;
        } else {


            await client.communityMembers.create({
                data: {
                    communityId: communityCred.id,
                    memberId: userId
                }
            })


            res.status(200).json({
                status: "success",
                payload: {
                    message: "joined community successfully!",
                    communityName: communityCred.name,
                    communitDescription: communityCred.descp,
                    membersCanPost: communityCred.membersCanPost,
                    foundersName: communityCred.founder.userName
                }
            })



        }
    } catch (e) {
        console.error("Some runtime error\n\n");
        console.error(e);
        res.status(400).json({
            status: "failure",
            payload: {
                message: "Error joining the community, Internal server errro"
            }
        })
        return;
    }

}


export const shareLogin = async (req: Request, res: Response) => {
    try {
        const { communityId } = req.body;

        const communityCred = await client.community.findFirst({
            where: {
                id: communityId
            }, select: {
                hash: true,
                name: true,
                password: true
            }
        })

        if (communityCred === null) {
            res.status(404).json({
                status: "failure",
                payload: {
                    message: "Community not found"
                }
            });
            return;
        }

        const message = `Hey there! I'd love for you to join our community on SecondBrain. Just enter this community ID: secondbrain:${communityCred?.name}@${communityCred?.hash} .And that's it — you're now part of our growing space!!`;

        res.status(200).json({
            status: "success",
            payload: {
                message
            }
        })
        return;
    } catch (e) {
        console.error("Error happened\n\n");
        console.error(e);
        res.status(400).json({
            status: "failure",
            payload: {
                message: "Internal server error"
            }
        })
        return;
    }
}



export const fetchCommunityContent = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        const communityId = parseInt(req.query.communityId as string);
        const limit = parseInt(req.query.limit as string) < 20 ? parseInt(req.query.limit as string) : 20;
        const page = parseInt(req.query.page as string) || 1;
        const skip = (page - 1) * limit;

        const count = await client.communityContent.count({
            where: {
                communityId
            }
        })

        const content = await client.communityContent.findMany({
            where: { communityId },
            skip,
            take: limit,
            orderBy: [
                {createdAt : "desc"},
                { upVotes: "desc" },
                { downVotes : "asc"}
            ],
            select: {
                content: {
                    select: {
                        title: true, note: true, createdAt: true,
                        hyperlink: true, type: true,id: true,
                        user: { select: { userName: true, id: true, profilePic : true } },
                    }
                },
                upVotes: true,
                downVotes : true
            }
        })

        const contentIdList = content.map((el) => (el.content.id))

        const voteByUser = await client.voteLog.findMany({
            where :  {
                contentId : { in :  contentIdList},
                userId
            },select : {
                contentId : true,
                vote : true
            }
        })

        const voteMap = new Map(voteByUser.map((v) => [v.contentId, v.vote]));

        const enrichedContent = content.map((c) => ({
            ...c,
            isOwner: c.content.user.id === userId,
            usersVote: voteMap.get(c.content.id) ?? "NONE",
        }));

        res.status(200).json({
            status: "success",
            payload: {
                content : enrichedContent,
                message: content.length === 0 ? "No content found" : "Contents found",
                more: page * limit < count
            }
        })

    } catch (e) {
        console.error("Error occured in fetch community content\n\n");
        console.error(e);
        res.status(500).json({
            status: "failure",
            payload: { message: "Internal server" }
        })
    }
}



export const upVoteDownVote = async (req: Request, res: Response) => {
    try {
        const { communityId, contentId, userId, vote } = req.body;

        let statusMessage = "vote counted";

        let upVotes, downVotes;


        await client.$transaction(async (tx) => {

            const pastVote = await tx.voteLog.findFirst({
                where: {
                    contentId,
                    userId
                }, select: {
                    vote : true
                }
            })

            if (pastVote) {
                if (pastVote.vote === vote) {
                    const votesRes = await tx.communityContent.update({
                        where: {
                            contentId,
                            communityId,
                        }, data: {
                            upVotes: vote == "upVote" ? { decrement: 1 } : undefined,
                            downVotes: vote == "downVote" ? { decrement: 1 } : undefined
                        }, select: {
                            upVotes: true,
                            downVotes: true
                        }
                    })

                    await tx.voteLog.delete({
                        where: {
                            userId_communityId_contentId: {
                                userId,
                                communityId,
                                contentId
                            }
                        }
                    })

                    upVotes = votesRes.upVotes;
                    downVotes = votesRes.downVotes;
                    statusMessage = "vote removed"
                } else {
                    const votesRes = await tx.communityContent.update({
                        where: {
                            contentId,
                            communityId
                        }, data: {
                            upVotes: vote !== "upVote" ? { decrement: 1 } : { increment: 1 },
                            downVotes: vote !== "downVote" ? { decrement: 1 } : { increment: 1 }
                        }, select: {
                            upVotes: true,
                            downVotes: true
                        }
                    })

                    await tx.voteLog.update({
                        where: {
                            userId_communityId_contentId: {
                                userId,
                                communityId,
                                contentId
                            }
                        }, data: {
                            vote
                        }
                    });

                    upVotes = votesRes.upVotes;
                    downVotes = votesRes.downVotes;
                    statusMessage = "vote switched"
                }
            } else {
                const votesRes = await tx.communityContent.update({
                    where: {
                        contentId,
                        communityId
                    }, data: {
                        upVotes: vote == "upVote" ? { increment: 1 } : undefined,
                        downVotes: vote == "downVote" ? { increment: 1 } : undefined
                    }, select: {
                        upVotes: true,
                        downVotes: true
                    }
                })


                await tx.voteLog.create({
                    data: {
                        userId,
                        vote,
                        contentId,
                        communityId
                    }
                })

                upVotes = votesRes.upVotes;
                downVotes = votesRes.downVotes;
                statusMessage = "vote added"
            }
            return;

        })

        res.status(200).json({
            status: "Success",
            payload: {
                message: statusMessage,
                upVotes,
                downVotes
            }
        })

    } catch (e) {
        console.error("Error in voting the content\n\n");
        console.error(e);
        res.status(500).json({
            status: "failure",
            payload: {
                message: "Internal server error"
            }
        })
    }
}






export const addCommunityContent = async (req: Request, res: Response) => {
    try {
        const { title, hyperlink, note, type, userId, communityId } = req.body;

        const content  = await client.$transaction(async (tx) => {
            const content = await tx.content.create({
                data: {
                    hyperlink,
                    title,
                    note,
                    userId,
                    type
                }, select: {
                    id: true,
                    hyperlink: true,
                    title: true,
                    note: true,
                    userId: true,
                    type: true
                }
            })

            await tx.communityContent.create({
                data: {
                    contentId: content.id,
                    communityId,
                }
            })

            return content;
        })

        res.status(200).json({
            status : "success",
            payload : {
                content
            }
        })
    } catch (e) {
        console.error("Error adding new content ina community");
        handleError(e,res);
    }
}




export const getUserList = async (req: Request, res: Response) => {
    try{
        const {communityId } = req.body;

        const usersList = await client.communityMembers.findMany({
            where : {
                communityId
            },select : {
                member : {
                    select : {
                        userName : true,
                        id : true,
                        profilePic : true
                    }
                }
            }
        })

        const founder = await client.community.findFirst({
            where : {
                id : communityId
            },select : {
                founder : {
                    select : {
                        id : true,
                        userName  :true,
                        profilePic : true
                    }
                }
            }
        })

        const enrichedContent = [
            {
                id: founder?.founder.id ?? -1,
                userName: founder?.founder?.userName ?? '',
                profilePic: founder?.founder?.profilePic ?? 'b1',
                isFounder: true,
            },
            ...usersList.map((m) => ({
                ...m.member,
                isFounder: false,
            }))
        ];


        res.status(200).json({
            status : "success",
            payload: {
                message : "got users list",
                usersList : enrichedContent
            }
        })
        return;

    }catch(e){
        console.error("Error occured in get users endpoint \n\n");
        handleError(e,res);
    }
}