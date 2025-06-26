import { Request, Response } from "express"; 
import bcrypt from 'bcrypt';
import { generateToken } from "../utils/jwts";
import handleError from "../utils/handleErrors"; 
import { setCookiesUtils } from "../utils/setCookies";
import client from '../prismaClient';


export const signUp = async (req: Request, res: Response) => {
    const {userName,email ,password, rememberMe} = req.body; 
    console.log('here')
    try {
        const ifExist = await client.user.findFirst({
            where: {
                userName: userName.trim()
            }
        });
        console.log('here2')

        if (!ifExist) {
            const hashedPassword: string = await bcrypt.hash(password.trim(), 10);

            const newUser = await client.user.create({
                data: {
                    userName: userName.trim(),
                    password: hashedPassword.trim(),
                    email : email.trim()
                },
                select: {
                    id: true
                }
            });

            //create initial dashboard collectoion for the user

            await client.collection.create({
                data : {
                    userId : newUser.id,
                    name : 'dashboard',
                    shared : false,
                    desc : `This second brain belongs to ${userName}`
                },select : {
                    id : true
                }
            })



            const token: string = generateToken({userId : newUser.id});

            setCookiesUtils(res, token, rememberMe);

            res.status(201).json({
                status: "success",
                payload:{
                   message: "user created successfully",
                   userName,
                   email
                }
                
            })

        } else {
            res.status(409).json({
                status: "failure",
                payload:{
                   message: "username already exist" 
                } 
            });
        }

        return;

    } catch (e) {
        handleError(e, res);
        return;
    }

}



export const signIn = async (req: Request, res: Response) => {

    const {userName, password,rememberMe} = req.body;
    console.log("reached");

    try {
        const checkUser = await client.user.findFirst({
            where: {
                userName: userName.trim()
            },
            select: {
                password: true,
                email: true,
                id: true
            }
        })

        if (checkUser) {

            const verify = await bcrypt.compare(password.trim(), checkUser.password);

            if (verify) {
                const token = generateToken({userId : checkUser.id});


                setCookiesUtils(res, token, rememberMe);
                
                console.log("reachere too")
                res.status(200).json({
                    status: "success",
                    payload: { message: 'Signed in successfully',
                        userName,
                        email : checkUser?.email
                    }
                });

            } else {
                res.status(401).json({
                    status: "failure",
                    payload:{
                       message: "Unautorised access/incorrect password",
                    } 
                })
            }


        } else {
            res.status(404).json({
                status: "failure",
                payload: {
                   message: "Invalid username" 
                } 
            })
        }

        return;

    } catch (e) {
        handleError(e, res);
        return;
    }
}


