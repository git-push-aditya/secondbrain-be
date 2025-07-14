import { NextFunction, Request, Response } from 'express';
import client from '../prismaClient';

export const checkContentCollectionReference = async (req: Request, res: Response, next: NextFunction) => {

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
    where: {
      userId: req?.body.userId,
      id: collectionId
    }
  })



  if (checkCollUser === null) {
    console.log(req.url)
    console.log('collection does not belong to this user');
    res.status(403).json({
      status: "failure",
      payload: {
        message: "unAutherized access"
      }
    })
    return;
  } else {
    next();
  }
}


export const checkUserCommunityRelation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const communityId = req?.body?.communityId || parseInt(req?.query?.communityId as string);
    const { userId } = req.body;

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





export const verifyExistingCommunityHash = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { communityId, userId } = req.body;
    const hash = communityId.trim().split('@')[1];
    const communityCred = await client.community.findFirst({
      where: {
        hash
      }, select: {
        founder: {
          select: {
            id: true
          }
        }, members: {
          select: {
            memberId: true
          }
        }
      }
    })

    if (!communityCred) {
      res.status(404).json({
        status: "failure",
        payload: {
          message: "No such community exist"
        }
      })
    } else {
      if (communityCred.founder.id === userId || communityCred.members.some((community) => community.memberId === userId)) {
        res.status(404).json({
          status: "failure",
          payload: {
            message: "User is alredy member or founder of the given community"
          }
        })
      }
    }
    return;
  } catch (e) {
    console.error("Some erro rocccured in verify existing member or founder check\n\n");
    console.error(e)
    res.status(400).json({
      status: "failure",
      payload: {
        message: "Internal server error"
      }
    })
    return;
  }
}




export const checkContentCommunityRelation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contentId, communityId } = req.body;

    const ifExist = await client.communityContent.findFirst({
      where: {
        contentId,
        communityId
      }
    })

    if (ifExist) {
      next();
      return;
    } else {
      res.status(403).json({
        status: "failure",
        payload: {
          message: "invalid content; no such content belong to said community"
        }
      })
      return;
    }
  } catch (e) {
    console.error("some error is content community relation check middleware\n\n");
    console.error(e);
    res.status(401).json({
      status: "failure",
      payload: {
        message: "Internal server error"
      }
    });
    return;
  }
}