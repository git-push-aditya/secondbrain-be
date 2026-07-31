import { serialize } from "cookie";
import { Response } from "express";

const isProd = process.env.NODE_ENV === "production";

// Frontend and backend live on different domains in prod, so the cookie is
// cross-site: it needs SameSite=None + Secure or the browser will silently
// drop it on every request after login. Locally both run on "localhost"
// (same-site regardless of port), so Lax + non-secure works over plain HTTP.
export const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' as const : 'lax' as const,
    path: '/'
};

export const setCookiesUtils = ( res:  Response, token : string, rememberMe : Boolean) => {
    const maxAge = rememberMe
        ? 60 * 60 * 24 * 7   //rememeber me makes sure user is logged in for 7 days
        : 60 * 60 * 24;      //rememeber me is false, such that it is saved for 1 day

    res.setHeader('Set-Cookie', serialize('token', token, {
        ...cookieOptions,
        maxAge
    }));
}