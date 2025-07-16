"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreMe = void 0;
const cookie_1 = require("cookie");
const prismaClient_1 = __importDefault(require("../prismaClient"));
const restoreMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("reached");
    const userId = req.body.userId;
    const userDetails = yield prismaClient_1.default.user.findUnique({
        where: {
            id: userId
        }, select: {
            userName: true,
            email: true,
            gender: true
        }
    });
    if (userDetails) {
        const token = req.cookies['token'];
        res.setHeader('Set-Cookie', (0, cookie_1.serialize)('token', token, {
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
                message: " jwt verified, no need to login/up",
                userName: userDetails.userName,
                email: userDetails.email,
                gender: userDetails.gender
            }
        });
        return;
    }
    else {
        res.status(400).json({
            status: "failure",
            payload: {
                message: "continue with login/up"
            }
        });
    }
});
exports.restoreMe = restoreMe;
