import { NextFunction, Request, Response } from 'express';
import client from '../prismaClient';

export const checkContentCollectionReference = async (req: Request, res : Response,next : NextFunction) => {
 
    const collectionId = req?.body.collectionId || parseInt(req?.query.collectionId as string);

    const checkCollUser = await client.collection.findFirst({
        where : {
            userId : req?.body.userId,
            id : collectionId 
        }
    })

    if (isNaN(collectionId)) {
        res.status(400).json({
            status: 'failure',
            payload: {
                message: 'Invalid or missing collectionId',
            },
        });
        return;
    }

    if(checkCollUser === null){
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