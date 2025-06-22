import {Router} from 'express';
import verifyJwt from '../middlewares/jwstAuth'
import {zodAddContent, zodDeleteContent, meZod, zodSharableLink, zodTaggedContent, zodCreateCollection, zodFetchContent, zodSharedContent} from '../middlewares/zodMiddleware';
import { addContent, deleteCollection, deleteContent, deleteSharedLink, fetchContent, fetchTaggedContent, generateSharableLink, getCommCollList, newCollection, pagedSharedConetnt, sharedContent } from '../controllers/userController';
import { checkContentCollectionReference } from '../middlewares/checkContentCollection';

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


router.get('/communitycollectionlist',meZod, verifyJwt, getCommCollList);///****
//have to add the gpt enpoint

//working: 
/*
    -fetch query
    -convert to embedding
    -have a vector db which has embedddings of the contents of all the users (received using a web crawler: something juicy soup)
    -get cosine similarity and send top 4 / 2 / 1 along with query to gemini api //free
    -receive the output and send it to user

*/
export default router;


