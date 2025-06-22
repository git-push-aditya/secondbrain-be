import { serialize } from "cookie";
import { Response } from "express";

export const setCookiesUtils = ( res:  Response, token : string, rememberMe : Boolean) => {
    if(!rememberMe){
        res.setHeader('Set-Cookie', serialize('token', token, {
            httpOnly: true,
            secure: false, 
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, //rememeber me is false, such that it is saved for 1 day
            path: '/'
        }));    
    }else{
        res.setHeader('Set-Cookie', serialize('token', token, {
            httpOnly: true,
            secure: false, 
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7,   //rememeber me makes sure user is logged in for 7 days
            path: '/'
        }));
    }
}