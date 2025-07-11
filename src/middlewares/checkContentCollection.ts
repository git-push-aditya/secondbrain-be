import { NextFunction, Request, Response } from 'express';
import client from '../prismaClient';

export const checkContentCollectionReference = async (req: Request, res : Response,next : NextFunction) => {
 
    const collectionId = req?.body.collectionId || parseInt(req?.query.collectionId as string);

    if (isNaN(collectionId)) {
        res.status(400).json({
            status: 'failure',
            payload: {
                message: 'Invalid or missing collectionId',
            },
        });
        return;
    }

    const checkCollUser = await client.collection.findFirst({
        where : {
            userId : req?.body.userId,
            id : collectionId 
        }
    })



    if(checkCollUser === null){
        console.log(req.url)
        console.log('collection does not belong to this user');
        res.status(403).json({
            status : "failure",
            payload :{
                message : "unAutherized access"
            }
        })
        return;
    }else{
        next();
    }
}


export const checkUserCommunityRelation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, communityId } = req.body;

    const user = await client.user.findFirst({
      where: { id: userId },
      select: {
        founded: { select: { id: true } },
        memberOf: { select: { communityId: true } },
      },
    });

    if (!user) {
      res.status(404).json({
        status: "failure",
        payload: { message: "User not found" },
      });
      return;
    }

    const isFounder = user.founded.some(c => c.id === communityId);
    const isMember = user.memberOf.some(m => m.communityId === communityId);

    if (isFounder || isMember) {
      console.log("middle ware passed")
      next();
      return;
    }

    res.status(403).json({
      status: "failure",
      payload: { message: "User does not belong to this community" },
    }); 
    return;
  } catch (e) {
    console.error("Error in checkUserCommunityRelation middleware:", e);
    res.status(500).json({
      status: "failure",
      payload: { message: "Internal server error" },
    }); 
    return;
  }
};
