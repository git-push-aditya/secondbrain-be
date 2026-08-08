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
const client_1 = require("@prisma/client");
/* @node-rs/bcrypt over bcryptjs: raw hashing speed is only marginally better, but the pure-JS
   implementation ran on the main thread and pinned the event loop for the whole ~200ms, so a
   handful of concurrent logins stalled every other in-flight request. This one hashes on the
   libuv threadpool. Hash format is unchanged, so existing $2a/$2b hashes still verify. */
const bcrypt_1 = require("@node-rs/bcrypt");
const jwts_1 = require("../utils/jwts");
const handleErrors_1 = __importDefault(require("../utils/handleErrors"));
const setCookies_1 = require("../utils/setCookies");
const userLists_1 = require("../utils/userLists");
const prismaClient_1 = __importDefault(require("../prismaClient"));
const SALT_ROUNDS = 10;
const signUp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { userName, email, password, rememberMe, profilePic } = req.body;
    try {
        const hashedPassword = yield (0, bcrypt_1.hash)(password.trim(), SALT_ROUNDS);
        /* No pre-flight "does this username exist" read: userName is @unique, so the insert
           itself is the check and a duplicate surfaces as P2002 below. The dashboard collection
           is nested rather than a second create - Prisma wraps a nested write in one implicit
           transaction, so a failure can no longer leave a user with no collection. */
        const newUser = yield prismaClient_1.default.user.create({
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
        const token = (0, jwts_1.generateToken)({ userId: newUser.id });
        (0, setCookies_1.setCookiesUtils)(res, token, rememberMe);
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
    }
    catch (e) {
        if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            const target = ((_b = (_a = e.meta) === null || _a === void 0 ? void 0 : _a.target) !== null && _b !== void 0 ? _b : []);
            const onEmail = Array.isArray(target) && target.includes('email');
            res.status(409).json({
                status: "failure",
                payload: {
                    message: onEmail ? "email already registered" : "username already exist"
                }
            });
            return;
        }
        (0, handleErrors_1.default)(e, res);
        return;
    }
});
exports.signUp = signUp;
const signIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userName, password, rememberMe } = req.body;
    try {
        const checkUser = yield prismaClient_1.default.user.findUnique({
            where: {
                userName: userName.trim()
            },
            select: {
                password: true,
                email: true,
                id: true,
                profilePic: true
            }
        });
        if (!checkUser) {
            res.status(404).json({
                status: "failure",
                payload: {
                    message: "Invalid username"
                }
            });
            return;
        }
        const verify = yield (0, bcrypt_1.compare)(password.trim(), checkUser.password);
        if (!verify) {
            res.status(401).json({
                status: "failure",
                payload: {
                    message: "Unautorised access/incorrect password",
                }
            });
            return;
        }
        const token = (0, jwts_1.generateToken)({ userId: checkUser.id });
        (0, setCookies_1.setCookiesUtils)(res, token, rememberMe);
        //bundled so the client can fetch content immediately instead of waiting on a
        //follow-up /communitycollectionlist round trip just to learn its own collectionId
        const lists = yield (0, userLists_1.getUserLists)(checkUser.id);
        res.status(200).json({
            status: "success",
            payload: Object.assign({ message: 'Signed in successfully', userName, email: checkUser.email, profilePic: checkUser.profilePic }, lists)
        });
        return;
    }
    catch (e) {
        (0, handleErrors_1.default)(e, res);
        return;
    }
});
exports.signIn = signIn;
