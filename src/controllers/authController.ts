import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
/* @node-rs/bcrypt over bcryptjs: raw hashing speed is only marginally better, but the pure-JS
   implementation ran on the main thread and pinned the event loop for the whole ~200ms, so a
   handful of concurrent logins stalled every other in-flight request. This one hashes on the
   libuv threadpool. Hash format is unchanged, so existing $2a/$2b hashes still verify. */
import { hash as bcryptHash, compare as bcryptCompare } from '@node-rs/bcrypt';
import { generateToken } from "../utils/jwts";
import handleError from "../utils/handleErrors";
import { setCookiesUtils } from "../utils/setCookies";
import { getUserLists } from "../utils/userLists";
import client from '../prismaClient';

const SALT_ROUNDS = 10;


export const signUp = async (req: Request, res: Response) => {
    const { userName, email, password, rememberMe, profilePic } = req.body;

    try {
        const hashedPassword: string = await bcryptHash(password.trim(), SALT_ROUNDS);

        /* No pre-flight "does this username exist" read: userName is @unique, so the insert
           itself is the check and a duplicate surfaces as P2002 below. The dashboard collection
           is nested rather than a second create - Prisma wraps a nested write in one implicit
           transaction, so a failure can no longer leave a user with no collection. */
        const newUser = await client.user.create({
            data: {
                userName: userName.trim(),
                password: hashedPassword,
                email: email.trim(),
                profilePic,
                collection: {
                    create: {
                        name: 'dashboard',
                        shared: false,
                        desc: `This second brain belongs to ${userName}`
                    }
                }
            },
            select: {
                id: true,
                collection: { select: { id: true, name: true, shared: true } }
            }
        });

        const token: string = generateToken({ userId: newUser.id });

        setCookiesUtils(res, token, rememberMe);

        res.status(201).json({
            status: "success",
            payload: {
                message: "user created successfully",
                userName,
                email,
                profilePic,
                //a fresh account has no tags and no communities yet, so these need no query
                tagsList: [],
                collectionList: newUser.collection,
                allCommunities: []
            }
        });

        return;

    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            const target = (e.meta?.target ?? []) as string[];
            const onEmail = Array.isArray(target) && target.includes('email');

            res.status(409).json({
                status: "failure",
                payload: {
                    message: onEmail ? "email already registered" : "username already exist"
                }
            });
            return;
        }

        handleError(e, res);
        return;
    }

}



export const signIn = async (req: Request, res: Response) => {

    const { userName, password, rememberMe } = req.body;

    try {
        const checkUser = await client.user.findUnique({
            where: {
                userName: userName.trim()
            },
            select: {
                password: true,
                email: true,
                id: true,
                profilePic: true
            }
        })

        if (!checkUser) {
            res.status(404).json({
                status: "failure",
                payload: {
                    message: "Invalid username"
                }
            })
            return;
        }

        const verify = await bcryptCompare(password.trim(), checkUser.password);

        if (!verify) {
            res.status(401).json({
                status: "failure",
                payload: {
                    message: "Unautorised access/incorrect password",
                }
            })
            return;
        }

        const token = generateToken({ userId: checkUser.id });
        setCookiesUtils(res, token, rememberMe);

        //bundled so the client can fetch content immediately instead of waiting on a
        //follow-up /communitycollectionlist round trip just to learn its own collectionId
        const lists = await getUserLists(checkUser.id);

        res.status(200).json({
            status: "success",
            payload: {
                message: 'Signed in successfully',
                userName,
                email: checkUser.email,
                profilePic: checkUser.profilePic,
                ...lists
            }
        });

        return;

    } catch (e) {
        handleError(e, res);
        return;
    }
}
