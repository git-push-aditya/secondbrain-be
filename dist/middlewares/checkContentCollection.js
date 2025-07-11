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
exports.checkUserCommunityRelation = exports.checkContentCollectionReference = void 0;
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
    try {
        const { userId, communityId } = req.body;
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
