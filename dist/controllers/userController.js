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
exports.deleteCollection = exports.getCommCollList = exports.newCollection = exports.deleteSharedLink = exports.fetchTaggedContent = exports.pagedSharedConetnt = exports.sharedContent = exports.generateSharableLink = exports.fetchContent = exports.deleteContent = exports.addContent = void 0;
const handleErrors_1 = __importDefault(require("../utils/handleErrors"));
const generateHash_1 = require("../utils/generateHash");
const prismaClient_1 = __importDefault(require("../prismaClient"));
const pinecone_1 = require("@pinecone-database/pinecone");
const server_1 = __importDefault(require("../server"));
const pinecone = new pinecone_1.Pinecone({
    apiKey: process.env.PINECONE_VDB_API_KEY || ''
});
const store = pinecone.index('secondbrain');
const addContent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, hyperlink, note, type, existingTags, newTags, userId, collectionId } = req.body;
        const ifExist = yield prismaClient_1.default.contentCollection.findFirst({
            where: {
                collection: {
                    is: {
                        id: collectionId,
                        userId: userId
                    }
                },
                content: {
                    is: {
                        hyperlink
                    }
                }
            },
            select: {
                contentId: true
            }
        });
        if (ifExist && ifExist.contentId) {
            console.log('user is trying to enter same link in the same collection multiple times');
            res.status(400).json({
                status: "failure",
                payload: {
                    message: "Duplicate entry by user"
                }
            });
            return;
        }
        //new tags added
        let filteredNewTags = newTags.filter((tag) => !existingTags.includes(tag));
        //old tags fetched
        let oldTags = [];
        if (existingTags.length != 0) {
            const oldTagsIdList = yield prismaClient_1.default.tags.findMany({
                where: {
                    title: {
                        in: existingTags
                    }
                },
                select: {
                    title: true,
                    id: true
                }
            });
            oldTags = oldTagsIdList;
        }
        filteredNewTags = filteredNewTags
            .filter((tag) => !oldTags.some((oldTag) => oldTag.title === tag));
        let newtag = [];
        const { newContent, tagsList } = yield prismaClient_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            if (filteredNewTags.length != 0) {
                const newTagsUpload = yield tx.tags.createManyAndReturn({
                    data: filteredNewTags.map((tag) => ({
                        title: tag
                    })),
                    select: {
                        id: true,
                        title: true
                    }
                });
                newtag = newTagsUpload;
            }
            //new content created
            const newContent = yield tx.content.create({
                data: { title, hyperlink, note, type, userId },
                select: { id: true, title: true, hyperlink: true, note: true, createdAt: true, type: true },
            });
            //entry made in contetn collection table to map contetn to particular collection
            yield tx.contentCollection.create({
                data: {
                    collectionId: collectionId,
                    contentId: newContent.id
                }
            });
            const tagsList = Array.from(new Set([...newtag, ...oldTags]));
            if (tagsList.length != 0) {
                yield tx.contentTags.createMany({
                    data: tagsList.map((tag) => ({
                        contentId: newContent.id,
                        tagId: tag.id
                    }))
                });
            }
            return { newContent, tagsList };
        }));
        const enrichedContent = Object.assign(Object.assign({}, newContent), { tags: tagsList, userId });
        yield server_1.default.lPush('embedQueue', JSON.stringify(enrichedContent));
        res.status(200).json({
            status: "success",
            payload: {
                message: "Content created successfully",
                content: enrichedContent
            }
        });
    }
    catch (e) {
        (0, handleErrors_1.default)(e, res);
    }
});
exports.addContent = addContent;
const deleteContent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, contentId } = req.body;
    try {
        const deletedPost = yield prismaClient_1.default.content.delete({
            where: { id: contentId },
            select: { id: true }
        });
        console.log(deletedPost);
        yield store._deleteOne(`${contentId}`);
        console.log("Vector deleted with id", contentId);
        res.status(200).json({
            status: "success",
            payload: {
                message: "Content deleted successfully",
                contentId: deletedPost.id
            }
        });
    }
    catch (e) {
        (0, handleErrors_1.default)(e, res);
    }
    finally {
        return;
    }
});
exports.deleteContent = deleteContent;
const fetchContent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    const collectionId = parseInt(req.query.collectionId);
    const limit = parseInt(req.query.limit);
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    try {
        const count = yield prismaClient_1.default.contentCollection.count({
            where: {
                collection: {
                    is: {
                        userId
                    }
                },
                collectionId: collectionId
            }
        });
        const content = yield prismaClient_1.default.contentCollection.findMany({
            where: {
                collection: {
                    is: {
                        userId
                    }
                },
                collectionId: collectionId,
            },
            skip,
            take: limit,
            select: {
                collectionId: true,
                content: {
                    select: {
                        id: true,
                        title: true,
                        hyperlink: true,
                        note: true,
                        createdAt: true,
                        type: true,
                        tags: {
                            select: {
                                tag: {
                                    select: {
                                        id: true,
                                        title: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                content: {
                    createdAt: "desc"
                }
            }
        });
        res.status(200).json({
            status: "success",
            payload: {
                message: content.length === 0 ? "No content found" : "Contents found",
                content, //data is in content.content
                more: page * limit < count
            }
        });
    }
    catch (e) {
        (0, handleErrors_1.default)(e, res);
    }
    finally {
        return;
    }
});
exports.fetchContent = fetchContent;
const generateSharableLink = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, collectionId } = req.body;
    try {
        const check = yield prismaClient_1.default.link.findFirst({
            where: {
                userId: userId,
                collectionId: collectionId
            },
            select: {
                hash: true
            }
        });
        if (check === null) {
            const hash = (0, generateHash_1.generateHash)();
            yield prismaClient_1.default.link.create({
                data: {
                    userId: userId,
                    hash: hash,
                    collectionId: collectionId
                }
            });
            yield prismaClient_1.default.collection.update({
                where: {
                    id: collectionId
                }, data: {
                    shared: true
                }
            });
            const generatedLink = `http://localhost:5173/sharedbrain/?id=${hash}`;
            res.status(200).json({
                status: "success",
                payload: {
                    message: "Your brain is ready to be shared",
                    generatedLink
                }
            });
        }
        else {
            const generatedLink = `http://localhost:5173/sharedbrain/?id=${check === null || check === void 0 ? void 0 : check.hash}`;
            res.status(200).json({
                status: "success",
                payload: {
                    message: "Shareable link already present",
                    generatedLink
                }
            });
        }
    }
    catch (e) {
        (0, handleErrors_1.default)(e, res);
    }
    finally {
        return;
    }
});
exports.generateSharableLink = generateSharableLink;
//initial fetch that gets metadata
const sharedContent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestHash = req.query.id;
    try {
        const shareExist = yield prismaClient_1.default.link.findFirst({
            where: {
                hash: requestHash
            }, select: {
                collection: {
                    select: {
                        name: true,
                        desc: true
                    }
                },
                user: {
                    select: {
                        userName: true,
                        profilePic: true
                    }
                }
            }
        });
        if (shareExist !== null) {
            res.status(200).json({
                status: "success",
                payload: {
                    message: "Collection is shared// sending metadat",
                    userName: shareExist.user.userName,
                    collectionName: shareExist.collection.name,
                    collectionDesc: shareExist.collection.desc,
                    userProfilePic: shareExist.user.profilePic
                }
            });
        }
        else {
            res.status(404).json({
                status: "failure",
                payload: {
                    message: "Link does not exist !! Either you have wrong link or the user doent share his brain anymore"
                }
            });
        }
    }
    catch (e) {
        (0, handleErrors_1.default)(e, res);
    }
    finally {
        return;
    }
});
exports.sharedContent = sharedContent;
//to actually fetch userdata in shared page
const pagedSharedConetnt = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const hash = req.query.hash;
    const page = req.query.page;
    const limit = req.query.limit;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const collectionId = yield prismaClient_1.default.link.findFirst({
        where: { hash },
        select: { collectionId: true }
    });
    if (collectionId === null) {
        console.error("unauthorized access");
        res.status(400).json({
            status: "failure",
            payload: {
                message: "No shared collection exist"
            }
        });
        return;
    }
    try { //more field in the return which
        const count = yield prismaClient_1.default.contentCollection.count({
            where: {
                collectionId: collectionId.collectionId
            }
        });
        const paginatedSharedData = yield prismaClient_1.default.contentCollection.findMany({
            where: {
                collectionId: collectionId.collectionId,
                collection: {
                    is: {
                        shared: true
                    }
                }
            },
            skip,
            take: parseInt(limit),
            orderBy: [{ content: { createdAt: "desc" } }],
            select: {
                collectionId: true,
                content: {
                    select: {
                        id: true,
                        title: true,
                        hyperlink: true,
                        createdAt: true,
                        note: true,
                        type: true,
                        tags: {
                            select: {
                                tag: {
                                    select: {
                                        id: true,
                                        title: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        res.status(200).json({
            status: "success",
            payload: {
                message: "fetched content successfully",
                content: paginatedSharedData,
                more: parseInt(page) * parseInt(limit) < count
            }
        });
    }
    catch (e) {
        console.error("some error occured", e);
        (0, handleErrors_1.default)(e, res);
    }
    return;
});
exports.pagedSharedConetnt = pagedSharedConetnt;
//only change i want ot make is it returns collection name
const fetchTaggedContent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tags, userId, union } = req.body;
    console.log("reached");
    try {
        const tagIdArr = yield prismaClient_1.default.tags.findMany({
            where: {
                title: {
                    in: tags
                }
            }, select: {
                id: true,
                title: true
            }
        });
        const tagIdArray = tagIdArr.map((tag) => tag.id);
        if (tagIdArray.length !== 0) {
            const taggedContent = yield prismaClient_1.default.contentTags.findMany({
                where: {
                    AND: [{
                            content: {
                                userId: userId
                            }
                        }, {
                            tagId: {
                                in: tagIdArray
                            }
                        }]
                },
                select: {
                    tag: {
                        select: {
                            title: true
                        }
                    },
                    content: {
                        select: {
                            title: true,
                            note: true,
                            hyperlink: true,
                            createdAt: true,
                            userId: true,
                            id: true,
                            type: true
                        }
                    }
                },
                orderBy: {
                    tagId: "desc"
                }
            });
            let refinedContent = [];
            if (taggedContent.length != 0) {
                const contentMap = new Map();
                taggedContent.forEach((contentEl) => {
                    const existingContent = contentMap.get(contentEl.content.id);
                    if (existingContent) {
                        existingContent.tags.push(contentEl.tag.title);
                    }
                    else {
                        contentMap.set(contentEl.content.id, {
                            id: contentEl.content.id,
                            title: contentEl.content.title,
                            hyperlink: contentEl.content.hyperlink,
                            note: contentEl.content.note,
                            createdAt: contentEl.content.createdAt,
                            type: contentEl.content.type,
                            userId: contentEl.content.userId,
                            tags: [contentEl.tag.title]
                        });
                    }
                });
                refinedContent = Array.from(contentMap.values());
            }
            if (union) { //union means give all the contetnd even if it contains only single tag belongin to hte users list
                if (refinedContent.length === 0) {
                    res.status(204).json({
                        status: "success",
                        payload: {
                            message: "No content found for the given tags",
                            taggedContent: []
                        }
                    });
                }
                else {
                    res.status(200).json({
                        status: "success",
                        payload: {
                            message: "Content fetched successfuly",
                            taggedContetn: refinedContent
                        }
                    });
                }
            }
            else { //!union or intersection means give only content who have all of those tags requested by user
                const intersectedContent = refinedContent.filter((contentEl) => tags.every((tag) => contentEl.tags.includes(tag)));
                if (intersectedContent.length === 0) {
                    res.status(204).json({
                        status: "success",
                        payload: {
                            message: "No content found for the given tags",
                            taggedContent: []
                        }
                    });
                }
                else {
                    res.status(200).json({
                        status: "success",
                        payload: {
                            message: "Content fetched successfuly",
                            taggedContent: intersectedContent
                        }
                    });
                }
            }
            return;
        }
        res.status(404).json({
            status: "failure",
            payload: {
                message: "No such tags exist"
            }
        });
    }
    catch (e) {
        (0, handleErrors_1.default)(e, res);
    }
    finally {
        return;
    }
});
exports.fetchTaggedContent = fetchTaggedContent;
const deleteSharedLink = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, collectionId } = req.body;
    try {
        yield prismaClient_1.default.link.delete({
            where: {
                userId: userId,
                collectionId: collectionId
            }
        });
        yield prismaClient_1.default.collection.update({
            where: {
                id: collectionId
            }, data: {
                shared: false
            }
        });
        res.status(200).json({
            status: "success",
            payload: {
                message: "shared link deleted successfully"
            }
        });
    }
    catch (e) {
        (0, handleErrors_1.default)(e, res);
    }
    finally {
        return;
    }
});
exports.deleteSharedLink = deleteSharedLink;
const newCollection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, collectionName, collectionDesc } = req.body;
    try {
        const newCollection = yield prismaClient_1.default.collection.create({
            data: {
                name: collectionName,
                userId: userId,
                desc: collectionDesc
            }, select: {
                id: true,
                name: true
            }
        });
        res.status(200).json({
            status: "success",
            payload: {
                message: " Collection created successfully ",
                collectionId: newCollection.id,
                collectionName: newCollection.name
            }
        });
    }
    catch (e) {
        console.error("Error creating new collection for the user ");
        res.status(500).json({
            status: "failure",
            payload: {
                message: " Internal server error "
            }
        });
    }
});
exports.newCollection = newCollection;
/// in /me i send a list of user collection and its id and also send a list of existing tags, in frontend before api call we seprate the list from existing and new
//alson on frontend make seure before api call no two collections have same name
const getCommCollList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    try {
        const collectionList = yield prismaClient_1.default.collection.findMany({
            where: {
                userId: userId
            }, select: {
                id: true,
                name: true,
                shared: true
            }
        });
        const tagsList = yield prismaClient_1.default.tags.findMany({
            select: {
                title: true
            }
        });
        const communitylist = yield prismaClient_1.default.user.findMany({
            where: {
                id: userId
            }, select: {
                founded: {
                    select: {
                        name: true,
                        id: true
                    }
                }, memberOf: {
                    select: {
                        community: {
                            select: {
                                name: true,
                                id: true
                            }
                        }
                    }
                }
            }
        });
        const list = communitylist[0];
        const founded = (list.founded || []).map(community => ({
            id: community.id,
            name: community.name,
            isFounder: true
        }));
        const memberOf = (list.memberOf || []).map(community => ({
            id: community.community.id,
            name: community.community.name,
            isFounder: false
        }));
        const allCommunities = [...founded, ...memberOf];
        res.status(200).json({
            status: "success",
            payload: {
                message: "got collection, tab and communitylist",
                tagsList,
                collectionList,
                allCommunities
            }
        });
    }
    catch (e) {
        console.error('errro getting data');
        res.status(400).json({
            status: "failure",
            payload: {
                message: "internal server error"
            }
        });
    }
});
exports.getCommCollList = getCommCollList;
const deleteCollection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { collectionId } = req.body;
    const ifDashboard = yield prismaClient_1.default.collection.findFirst({
        where: {
            id: collectionId
        }, select: {
            name: true
        }
    });
    if (!ifDashboard === null || (ifDashboard === null || ifDashboard === void 0 ? void 0 : ifDashboard.name) === 'dashboard') {
        res.status(400).json({
            status: 'failure',
            payload: {
                message: "Cannot delete dashboard"
            }
        });
        return;
    }
    try { ////made changes her
        const contentToDelete = yield prismaClient_1.default.content.findMany({
            where: {
                collection: {
                    is: {
                        collectionId: collectionId,
                    },
                },
            },
            select: { id: true }
        });
        yield prismaClient_1.default.content.deleteMany({
            where: {
                id: { in: contentToDelete.map(c => c.id) }
            }
        });
        const deletedDashboard = yield prismaClient_1.default.collection.delete({
            where: {
                id: collectionId
            }, select: {
                id: true
            }
        });
        res.status(200).json({
            status: "success",
            payload: {
                message: "Collection and its contetn deleted successfull",
                deletedId: deletedDashboard.id
            }
        });
    }
    catch (e) {
        console.error('Error deleting the collection ', e);
        (0, handleErrors_1.default)(e, res);
    }
});
exports.deleteCollection = deleteCollection;
