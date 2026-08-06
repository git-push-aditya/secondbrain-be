"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCookiesUtils = exports.cookieOptions = void 0;
const cookie_1 = require("cookie");
const isProd = process.env.NODE_ENV === "production";
// Frontend and backend live on different domains in prod, so the cookie is
// cross-site: it needs SameSite=None + Secure or the browser will silently
// drop it on every request after login. Locally both run on "localhost"
// (same-site regardless of port), so Lax + non-secure works over plain HTTP.
exports.cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/'
};
const setCookiesUtils = (res, token, rememberMe) => {
    const maxAge = rememberMe
        ? 60 * 60 * 24 * 7 //rememeber me makes sure user is logged in for 7 days
        : 60 * 60 * 24; //rememeber me is false, such that it is saved for 1 day
    res.setHeader('Set-Cookie', (0, cookie_1.serialize)('token', token, Object.assign(Object.assign({}, exports.cookieOptions), { maxAge })));
};
exports.setCookiesUtils = setCookiesUtils;
