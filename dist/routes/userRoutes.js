"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jwstAuth_1 = __importDefault(require("../middlewares/jwstAuth"));
const zodMiddleware_1 = require("../middlewares/zodMiddleware");
const userController_1 = require("../controllers/userController");
const checkContentCollection_1 = require("../middlewares/checkContentCollection");
const communityController_1 = require("../controllers/communityController");
const chatbot_1 = require("../controllers/chatbot");
const router = (0, express_1.Router)();
router.post('/addcontent', zodMiddleware_1.zodAddContent, jwstAuth_1.default, checkContentCollection_1.checkContentCollectionReference, userController_1.addContent);
router.post('/deletecontent', zodMiddleware_1.zodDeleteContent, jwstAuth_1.default, userController_1.deleteContent);
router.get('/fetchcontents', zodMiddleware_1.zodFetchContent, jwstAuth_1.default, checkContentCollection_1.checkContentCollectionReference, userController_1.fetchContent);
router.patch('/generatelink', zodMiddleware_1.meZod, jwstAuth_1.default, checkContentCollection_1.checkContentCollectionReference, userController_1.generateSharableLink);
router.post('/createcollection', zodMiddleware_1.zodCreateCollection, jwstAuth_1.default, userController_1.newCollection);
router.post('/deletecollection', zodMiddleware_1.meZod, jwstAuth_1.default, checkContentCollection_1.checkContentCollectionReference, userController_1.deleteCollection);
//used to fetch shared contet
router.get('/sharedbrain', zodMiddleware_1.zodSharableLink, userController_1.sharedContent);
router.get('/paginatedshareddata', zodMiddleware_1.zodSharedContent, userController_1.pagedSharedConetnt);
//not implmemnted//
router.get('/fetchtaggedcontent', zodMiddleware_1.zodTaggedContent, jwstAuth_1.default, userController_1.fetchTaggedContent);
router.post('/removeshare', zodMiddleware_1.meZod, jwstAuth_1.default, checkContentCollection_1.checkContentCollectionReference, userController_1.deleteSharedLink);
router.get('/communitycollectionlist', zodMiddleware_1.meZod, jwstAuth_1.default, userController_1.getCommCollList);
// community related
router.post('/createcommunity', zodMiddleware_1.zodCreateCommunity, jwstAuth_1.default, communityController_1.createCommunity);
router.post('/joinCommunity', zodMiddleware_1.zodjoinCommunity, jwstAuth_1.default, checkContentCollection_1.verifyExistingCommunityHash, communityController_1.joinCommunity);
router.post('/sharelogin', zodMiddleware_1.zodBasicCommunity, jwstAuth_1.default, checkContentCollection_1.checkUserCommunityRelation, communityController_1.shareLogin);
router.get('/getcommunitycontent', zodMiddleware_1.zodFetchContent, jwstAuth_1.default, checkContentCollection_1.checkUserCommunityRelation, communityController_1.fetchCommunityContent);
router.post('/vote', zodMiddleware_1.zodVote, jwstAuth_1.default, checkContentCollection_1.checkUserCommunityRelation, checkContentCollection_1.checkContentCommunityRelation, communityController_1.upVoteDownVote);
router.post('/getmembers', zodMiddleware_1.zodBasicCommunity, jwstAuth_1.default, checkContentCollection_1.checkUserCommunityRelation, communityController_1.getUserList);
router.post('/addcommunitycontent', zodMiddleware_1.zodAddContent, jwstAuth_1.default, checkContentCollection_1.checkUserCommunityRelation, communityController_1.addCommunityContent);
////////////////////////////////
router.post('/chatbot', zodMiddleware_1.zodChatBot, jwstAuth_1.default, chatbot_1.chatbot);
exports.default = router;
