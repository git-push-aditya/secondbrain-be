"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCookiesUtils = void 0;
const cookie_1 = require("cookie");
const setCookiesUtils = (res, token, rememberMe) => {
    if (!rememberMe) {
        res.setHeader('Set-Cookie', (0, cookie_1.serialize)('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, //rememeber me is false, such that it is saved for 1 day
            path: '/'
        }));
    }
    else {
        res.setHeader('Set-Cookie', (0, cookie_1.serialize)('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, //rememeber me makes sure user is logged in for 7 days
            path: '/'
        }));
    }
};
exports.setCookiesUtils = setCookiesUtils;
