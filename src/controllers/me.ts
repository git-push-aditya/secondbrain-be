import { Request, Response } from "express";
import { serialize } from "cookie";
import client from '../prismaClient';
import { cookieOptions } from '../utils/setCookies';
import { getUserLists } from '../utils/userLists';

export const restoreMe = async (req : Request, res : Response) => {
    const userId = req.body.userId;
    //session restore is the other entry point into the app, so it carries the lists too -
    //otherwise a returning user still pays a serial /communitycollectionlist before any content
    const [userDetails, lists] = await Promise.all([
        client.user.findUnique({
            where:{
                id : userId
            },select:{
                userName: true,
                email: true,
                profilePic : true
            }
        }),
        getUserLists(userId)
    ]);
    if(userDetails){

        const token = req.cookies['token'];
        res.setHeader('Set-Cookie', serialize('token', token, {// Refresh cookie to extend session
            ...cookieOptions,
            maxAge: 60 * 60 * 24
        }));
        res.setHeader("Cache-Control", "no-store");
        res.status(200).json({
            status: "success",
            payload: {
                message :" jwt verified, no need to login/up",
                userName : userDetails.userName,
                email : userDetails.email,
                profilePic : userDetails.profilePic,
                ...lists
            }
        })
        return;
    }else{
        res.status(400).json({
            status : "failure",
            payload : {
                message :"continue with login/up"
            }
        })
    }    
}