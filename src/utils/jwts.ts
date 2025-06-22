import jwt from 'jsonwebtoken'

interface tokenPayload {
    userId : number
}

export const generateToken  = (payload : tokenPayload) : string => {
    const secret = process.env.JWT_SECRET as string; 
    if (!secret) {
        console.log("seceret doenst exist");
        throw new Error("JWT secret is not defined.");
    }
    const token = jwt.sign(payload, secret);
    return token;
} 