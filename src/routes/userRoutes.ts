import {Router} from 'express';
import verifyJwt from '../middlewares/jwstAuth'
import {zodAddContent, zodDeleteContent, meZod, zodSharableLink, zodTaggedContent, zodCreateCollection, zodFetchContent, zodSharedContent, zodCreateCommunity, zodBasicCommunity, zodjoinCommunity, zodVote} from '../middlewares/zodMiddleware';
import { addContent, deleteCollection, deleteContent, deleteSharedLink, fetchContent, fetchTaggedContent, generateSharableLink, getCommCollList, newCollection, pagedSharedConetnt, sharedContent } from '../controllers/userController';
import { checkContentCollectionReference, checkContentCommunityRelation, checkUserCommunityRelation, verifyExistingCommunityHash } from '../middlewares/checkContentCollection';
import { addCommunityContent, createCommunity, fetchCommunityContent, getUserList, joinCommunity, shareLogin, upVoteDownVote } from '../controllers/communityController';

const router = Router();      

router.post('/addcontent', zodAddContent,verifyJwt, checkContentCollectionReference,addContent);//*** */

router.post('/deletecontent', zodDeleteContent, verifyJwt,deleteContent );//

router.get('/fetchcontents', zodFetchContent,verifyJwt,checkContentCollectionReference, fetchContent);//  

router.patch('/generatelink',meZod,verifyJwt,checkContentCollectionReference,generateSharableLink);//

router.post('/createcollection', zodCreateCollection, verifyJwt, newCollection);//****** */

router.post('/deletecollection',meZod,verifyJwt,checkContentCollectionReference,deleteCollection );


//used to fetch shared contet
router.get('/sharedbrain',zodSharableLink, sharedContent);//

router.get('/paginatedshareddata', zodSharedContent,pagedSharedConetnt);

//not implmemnted//
router.get('/fetchtaggedcontent' ,zodTaggedContent, verifyJwt, fetchTaggedContent);//  

router.post('/removeshare',meZod, verifyJwt,checkContentCollectionReference, deleteSharedLink); //


router.get('/communitycollectionlist',meZod, verifyJwt, getCommCollList);///
//have to add the gpt enpoint

//working: 
/*
    -get cosine similarity and send top 4 / 2 / 1 along with query to gemini api //free
    -receive the output and send it to user

*/


// community related


router.post('/createcommunity',zodCreateCommunity,verifyJwt,createCommunity); //*

router.post('/joinCommunity',zodjoinCommunity, verifyJwt,verifyExistingCommunityHash ,joinCommunity );//*

router.post('/sharelogin', zodBasicCommunity, verifyJwt, checkUserCommunityRelation, shareLogin);//*

router.get('/getcommunitycontent', zodFetchContent, verifyJwt, checkUserCommunityRelation,fetchCommunityContent);

router.post('/vote',zodVote, verifyJwt,checkUserCommunityRelation,checkContentCommunityRelation ,upVoteDownVote);

router.get('/getmembers', zodBasicCommunity,verifyJwt,checkUserCommunityRelation,getUserList);

router.post('/addcommunitycontent', zodAddContent, verifyJwt,checkUserCommunityRelation, addCommunityContent);



export default router;
