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
exports.checkContentCommunityRelation = exports.verifyExistingCommunityHash = exports.checkUserCommunityRelation = exports.checkContentCollectionReference = void 0;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const checkContentCollectionReference = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const collectionId = (req === null || req === void 0 ? void 0 : req.body.collectionId) || parseInt(req === null || req === void 0 ? void 0 : req.query.collectionId);
    if (isNaN(collectionId)) {
        res.status(400).json({
            status: 'failure',
            payload: {
                message: 'Invalid or missing collectionId',
            },
        });
        return;
    }
    const checkCollUser = yield prismaClient_1.default.collection.findFirst({
        where: {
            userId: req === null || req === void 0 ? void 0 : req.body.userId,
            id: collectionId
        }
    });
    if (checkCollUser === null) {
        console.log(req.url);
        console.log('collection does not belong to this user');
        res.status(403).json({
            status: "failure",
            payload: {
                message: "unAutherized access"
            }
        });
        return;
    }
    else {
        next();
    }
});
exports.checkContentCollectionReference = checkContentCollectionReference;
const checkUserCommunityRelation = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const communityId = ((_a = req === null || req === void 0 ? void 0 : req.body) === null || _a === void 0 ? void 0 : _a.communityId) || parseInt((_b = req === null || req === void 0 ? void 0 : req.query) === null || _b === void 0 ? void 0 : _b.communityId);
        const { userId } = req.body;
        const user = yield prismaClient_1.default.user.findFirst({
            where: { id: userId },
            select: {
                founded: { select: { id: true } },
                memberOf: { select: { communityId: true } },
            },
        });
        if (!user) {
            res.status(404).json({
                status: "failure",
                payload: { message: "User not found" },
            });
            return;
        }
        const isFounder = user.founded.some(c => c.id === communityId);
        const isMember = user.memberOf.some(m => m.communityId === communityId);
        if (isFounder || isMember) {
            console.log("middle ware passed");
            next();
            return;
        }
        res.status(403).json({
            status: "failure",
            payload: { message: "User does not belong to this community" },
        });
        return;
    }
    catch (e) {
        console.error("Error in checkUserCommunityRelation middleware:", e);
        res.status(500).json({
            status: "failure",
            payload: { message: "Internal server error" },
        });
        return;
    }
});
exports.checkUserCommunityRelation = checkUserCommunityRelation;
const verifyExistingCommunityHash = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { communityId, userId } = req.body;
        const hash = communityId.trim().split('@')[1];
        const communityCred = yield prismaClient_1.default.community.findFirst({
            where: {
                hash
            }, select: {
                founder: {
                    select: {
                        id: true
                    }
                }, members: {
                    select: {
                        memberId: true
                    }
                }
            }
        });
        if (!communityCred) {
            res.status(404).json({
                status: "failure",
                payload: {
                    message: "No such community exist"
                }
            });
        }
        else {
            if (communityCred.founder.id === userId || communityCred.members.some((community) => community.memberId === userId)) {
                res.status(409).json({
                    status: "failure",
                    payload: {
                        message: "User is alredy member or founder of the given community"
                    }
                });
            }
            else {
                next();
                return;
            }
        }
        return;
    }
    catch (e) {
        console.error("Some erro rocccured in verify existing member or founder check\n\n");
        console.error(e);
        res.status(400).json({
            status: "failure",
            payload: {
                message: "Internal server error"
            }
        });
        return;
    }
});
exports.verifyExistingCommunityHash = verifyExistingCommunityHash;
const checkContentCommunityRelation = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { contentId, communityId } = req.body;
        const ifExist = yield prismaClient_1.default.communityContent.findFirst({
            where: {
                contentId,
                communityId
            }
        });
        if (ifExist) {
            next();
            return;
        }
        else {
            res.status(403).json({
                status: "failure",
                payload: {
                    message: "invalid content; no such content belong to said community"
                }
            });
            return;
        }
    }
    catch (e) {
        console.error("some error is content community relation check middleware\n\n");
        console.error(e);
        res.status(401).json({
            status: "failure",
            payload: {
                message: "Internal server error"
            }
        });
        return;
    }
});
exports.checkContentCommunityRelation = checkContentCommunityRelation;
