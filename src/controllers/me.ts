import { Request, Response } from "express"; 
import { serialize } from "cookie";
import client from '../prismaClient';

export const restoreMe = async (req : Request, res : Response) => {
    console.log("reached")
    const userId = req.body.userId;
    const userDetails = await client.user.findUnique({
        where:{
            id : userId
        },select:{
            userName: true,
            email: true,
            gender : true
        }
    })
    if(userDetails){

        const token = req.cookies['token'];
        res.setHeader('Set-Cookie', serialize('token', token, {// Refresh cookie to extend session
            httpOnly: true,
            secure: false, 
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, 
            path: '/'
        }));
        res.setHeader("Cache-Control", "no-store");
        res.status(200).json({
            status: "success",
            payload: {
                message :" jwt verified, no need to login/up",
                userName : userDetails.userName,
                email : userDetails.email,
                gender : userDetails.gender
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