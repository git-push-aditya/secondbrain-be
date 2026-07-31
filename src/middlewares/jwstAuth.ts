import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import handleError from '../utils/handleErrors';

const secret: string = process.env.JWT_SECRET as string;

interface customPayload extends JwtPayload {
    userId: number
}

const verifyJwt = (req: Request, res: Response, next: NextFunction): void => {
    const token: string = req.cookies['token'] as string;

    if (!token) {
        res.status(401).json({
            status: "failure",
            payload: {
                message: "Not logged in/ session cookie missing"
            }
        });
        return;
    }

    try {
        const verify = jwt.verify(token, secret) as customPayload;
        if (verify.userId) {
            req.body.userId = verify.userId ;
            next();
        } else {
            res.status(401).json({
                status: "failure",
                payload: {
                    message: "Malformed session token/ Re-login"
                }
            });
            return;
        }

    } catch (e) {
        handleError(e, res);
        return;
    }

}


export default verifyJwt;