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
exports.signIn = exports.signUp = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwts_1 = require("../utils/jwts");
const handleErrors_1 = __importDefault(require("../utils/handleErrors"));
const setCookies_1 = require("../utils/setCookies");
const prismaClient_1 = __importDefault(require("../prismaClient"));
const signUp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userName, email, password, rememberMe, gender } = req.body;
    try {
        const ifExist = yield prismaClient_1.default.user.findFirst({
            where: {
                userName: userName.trim()
            }
        });
        if (!ifExist) {
            const hashedPassword = yield bcrypt_1.default.hash(password.trim(), 10);
            const newUser = yield prismaClient_1.default.user.create({
                data: {
                    userName: userName.trim(),
                    password: hashedPassword.trim(),
                    email: email.trim(),
                    gender
                }, select: {
                    id: true
                }
            });
            //create initial dashboard collectoion for the user
            yield prismaClient_1.default.collection.create({
                data: {
                    userId: newUser.id,
                    name: 'dashboard',
                    shared: false,
                    desc: `This second brain belongs to ${userName}`
                }, select: {
                    id: true
                }
            });
            const token = (0, jwts_1.generateToken)({ userId: newUser.id });
            (0, setCookies_1.setCookiesUtils)(res, token, rememberMe);
            res.status(201).json({
                status: "success",
                payload: {
                    message: "user created successfully",
                    userName,
                    email,
                    gender
                }
            });
        }
        else {
            res.status(409).json({
                status: "failure",
                payload: {
                    message: "username already exist"
                }
            });
        }
        return;
    }
    catch (e) {
        (0, handleErrors_1.default)(e, res);
        return;
    }
});
exports.signUp = signUp;
const signIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userName, password, rememberMe } = req.body;
    try {
        const checkUser = yield prismaClient_1.default.user.findFirst({
            where: {
                userName: userName.trim()
            },
            select: {
                password: true,
                email: true,
                id: true,
                gender: true
            }
        });
        if (checkUser) {
            const verify = yield bcrypt_1.default.compare(password.trim(), checkUser.password);
            if (verify) {
                const token = (0, jwts_1.generateToken)({ userId: checkUser.id });
                (0, setCookies_1.setCookiesUtils)(res, token, rememberMe);
                console.log("reachere too");
                res.status(200).json({
                    status: "success",
                    payload: { message: 'Signed in successfully',
                        userName,
                        email: checkUser === null || checkUser === void 0 ? void 0 : checkUser.email,
                        gender: checkUser === null || checkUser === void 0 ? void 0 : checkUser.gender
                    }
                });
            }
            else {
                res.status(401).json({
                    status: "failure",
                    payload: {
                        message: "Unautorised access/incorrect password",
                    }
                });
            }
        }
        else {
            res.status(404).json({
                status: "failure",
                payload: {
                    message: "Invalid username"
                }
            });
        }
        return;
    }
    catch (e) {
        (0, handleErrors_1.default)(e, res);
        return;
    }
});
exports.signIn = signIn;
