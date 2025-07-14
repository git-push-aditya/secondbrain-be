import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { joinCommunity } from '../controllers/communityController';

interface createCommunityType {
    name : String,
    descp : String,
    membersCanPost : Boolean,
    password : String
}




const requiredCookie = z.object({
    token: z
        .string()
        .regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/, {
            message: "Invalid JWT format",
        }),
}).passthrough();


export const signInUpZodMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const requiredBody = z.object({
        userName: z.string().min(5),
        rememberMe : z.boolean(),
        email : z.string().email().optional(),
        password: z.string().min(8).max(15).regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()|\[\]{}:])/,
            { message: 'Password must contain at least one lowercase, one upper case and 1 special character.' }
        )
    });

    const parsedObejct = requiredBody.safeParse(req.body);

    if (!parsedObejct.success) {
        console.log("Incorrect format of input object", req.body, parsedObejct.error?.format());
        res.status(401).json({         
            status: "failure",
            payload: {
               message: "Incorrect format of username/password/email" 
            }
            
        });

        return;
    }

    next();
}

export const meZod = (req: Request, res: Response, next: NextFunction) => {
 
    const cookieCheck = requiredCookie.safeParse(req.cookies);

    if(cookieCheck.success){
        next();
    }else{
        res.status(400).json({
            status: "failure",
            payload: {
                message: "unAuthorized access; login or re-login"
            } 
        })
    }
    
}




export const zodFetchContent = (req: Request, res: Response, next: NextFunction) => {
 
    const cookieCheck = requiredCookie.safeParse(req.cookies);

    const requiredQuery  = z.object({
        collectionId : z.coerce.number().optional(),
        communityId : z.coerce.number().optional(),
        page : z.coerce.number(),
        limit : z.coerce.number()
    })

    const bodyCheck = requiredQuery.safeParse(req.query);

    if(cookieCheck.success && bodyCheck.success){
        next();
    }else{
        res.status(400).json({
            status: "failure",
            payload: {
                message: "unAuthorized access; login or re-login"
            } 
        })
    }
    
}

export const zodSharedContent =  (req :Request , res :Response, next : NextFunction) => { 

    const requiredQuery  = z.object({ 
        page : z.coerce.number(),
        limit : z.coerce.number(),
        hash : z.string()
    })

    const queryCheck = requiredQuery.safeParse(req.query);

    if(queryCheck.success){
        next();
    }else{
        res.status(400).json({
            status: "failure",
            payload: {
                message: "unAuthorized access; login or re-login"
            } 
        })
    }
}



export const zodAddContent = (req: Request, res: Response, next: NextFunction): void => {
    const requiredBody = z.object({
        title: z.string().max(200, { message: "Maximum 200 characters are allowed" }),
        hyperlink: z.string().url({ message: "Invalid url format" }),
        note: z.string().max(600, { message: 'no more than 600 characters a re allowed' }).optional(),
        type: z.enum(['WEB', 'YOUTUBE', 'REDDIT', 'TWITTER', 'INSTAGRAM']),
        existingTags : z.string().array(),
        newTags : z.string().array(),
        collectionId : z.coerce.number().optional(),
        communityId : z.coerce.number().optional()
    });


    const bodyCheck = requiredBody.safeParse(req.body);
    const cookieCheck = requiredCookie.safeParse(req.cookies);


    if (bodyCheck.success && cookieCheck.success) {
        next()
    } else {
        if (!bodyCheck.success) {
            console.log("Body Errors:", bodyCheck.error?.format());
        }
        if (!cookieCheck.success) {
            console.log("Header error : ", cookieCheck.error?.format());
        }
        res.status(400).json({
            status: "failure",
            payload: {
                message: "Bad request; Invalid format"
            } 
        })
    }

    return;
}   


export const zodDeleteContent = (req: Request, res: Response, next : NextFunction) =>{
    const requiredBody = z.object({
        contentId : z.number({message : "Invalid contentId format"}) 
    })

    const bodyCheck = requiredBody.safeParse(req.body);
    const cookieCheck = requiredCookie.safeParse(req.cookies);

    if (bodyCheck.success && cookieCheck.success) {
        next()
    } else {
        if (!bodyCheck.success) {
            console.log("Body Errors : ", bodyCheck.error?.format());
        }
        if (!cookieCheck.success) {
            console.log("Header error : ", cookieCheck.error?.format());
        }
        res.status(400).json({
            status: "failure",
            payload: {
                message: "Bad request; Invalid format"
            } 
        })
    }

    return;
}


//note: no need to have jwt or verified to access someone elses shared content
//accessing shared content is not a secure route
export const zodSharableLink = (req: Request, res: Response, next: NextFunction) => {
    const validationSchema = z.object({
        id: z.string().nonempty().min(8, { message: "Sharable link (id) is missing or empty" })  
    });

    const result = validationSchema.safeParse({id: req.query.id});

    if (!result.success) {
        const error = result.error.issues[0];
        console.log("something happened : ", result.error?.format()) 

        res.status(400).json({
            status: "failure",
            payload: {
                message: error.message
            }   
        });
        return;
    }

    next();
};
 


export const zodTaggedContent = (req: Request<{}, {}, { tags: string[], union: boolean }>, res: Response, next : NextFunction) => {
    const validationSchema = z.object({
        tags : z.string().array().nonempty({message : "No tag passed"}),
        union : z.boolean()
    });

    const cookieCheck = requiredCookie.safeParse(req.cookies);

    const check = validationSchema.safeParse({
        tags : req.body.tags,
        union : req.body.union
    })

    if(!check.success || !cookieCheck.success){
        console.log("Error in tags or jwt: ",check.error?.issues[0]);
        res.status(400).json({
            status: "failure",
            payload: {
                message: "Invalid format of data passed",
                error: check.error?.issues[0].message
            }   
        });
        return;
    }
    
    next();   

}

export const zodCreateCollection = (req: Request<{}, {}, { collectionName: String, collectionDesc : String }>, res: Response, next : NextFunction ) => {

    const requiredBody = z.object({
        collectionName : z.string(),
        collectionDesc : z.string()
    })

    const cookieCheck = requiredCookie.safeParse(req.cookies);

    const bodyCheck = requiredBody.safeParse(req.body);

    if(cookieCheck.success && bodyCheck.success){
        next();
    }else if(!cookieCheck.success){
        console.error("session logout");
        res.status(401).json({
            status : "failure",
            payload : {
                message : "Session timed out, re-login"
            }
        })
    }else{
        console.error("Passed parameters for collection creation is invalid");
        res.status(400).json({
            status : "failure",
            payload  : {
                message : "Passed parameters for collection creation is invalid"
            }
        })
    }

    return;
}


//error code 401 for session logout, re-login

/////                 COMMUNITY STARTS HERE

export const zodCreateCommunity = (req: Request<{}, {}, createCommunityType>, res: Response, next : NextFunction) => {
    const requiredBody  = z.object({
        emailLead : z.string(),
        name : z.string(),
        descp : z.string(),
        membersCanPost : z.boolean(),
        password : z.string()
    })


    const cookieCheck = requiredCookie.safeParse(req.cookies);

    const bodyCheck = requiredBody.safeParse(req.body);

    if(cookieCheck.success && bodyCheck.success){
        next();
    }else if(!cookieCheck.success){
        console.error("session logout");
        res.status(401).json({
            status : "failure",
            payload : {
                message : "Session timed out, re-login"
            }
        })
    }else{
        console.error("Passed parameters for collection creation is invalid");
        res.status(400).json({
            status : "failure",
            payload  : {
                message : "Passed parameters for community creation is invalid"
            }
        })
    }

    return;
}


export const zodBasicCommunity = (req: Request<{}, {}, createCommunityType>, res: Response, next : NextFunction) => {
    const requiredBody  = z.object({
        communityId : z.coerce.number() 
    })


    const cookieCheck = requiredCookie.safeParse(req.cookies);

    const bodyCheck = requiredBody.safeParse(req.body);

    if(cookieCheck.success && bodyCheck.success){ 
        next();
        return;
    }else if(!cookieCheck.success){
        console.error("session logout");
        console.log(2)
        res.status(401).json({
            status : "failure",
            payload : {
                message : "Session timed out, re-login"
            }
        })
    }else{
        console.log(3)
        console.error("Passed parameters are invalid");
        res.status(400).json({
            status : "failure",
            payload  : {
                message : "Passed parameters for community is invalid"
            }
        })
    }
    console.log(4)
    return;
}

export const zodjoinCommunity = (req: Request<{}, {}, createCommunityType>, res: Response, next : NextFunction) => {
    const requiredBody  = z.object({
        communityId : z.string() 
    })

    const cookieCheck = requiredCookie.safeParse(req.cookies);

    const bodyCheck = requiredBody.safeParse(req.body);

    if(cookieCheck.success && bodyCheck.success){ 
        next(); 
        return;
    }else if(!cookieCheck.success){
        console.error("session logout"); 
        res.status(401).json({
            status : "failure",
            payload : {
                message : "Session timed out, re-login"
            }
        })
    }else{ 
        console.error("Passed parameters are invalid");
        res.status(400).json({
            status : "failure",
            payload  : {
                message : "Passed parameters to join a community is invalid"
            }
        })
    } 
    return;
}


export const zodVote = ( req: Request, res : Response , next : NextFunction) => {
    const requiredBody  = z.object({
        communityId : z.coerce.number(),
        contentId : z.coerce.number(),
        vote : z.enum(['upVote','downVote'])
    })

    const cookieCheck = requiredCookie.safeParse(req.cookies);

    const bodyCheck = requiredBody.safeParse(req.body);

    if(cookieCheck.success && bodyCheck.success){ 
        next(); 
        return;
    }else if(!cookieCheck.success){
        console.error("session logout"); 
        res.status(401).json({
            status : "failure",
            payload : {
                message : "Session timed out, re-login"
            }
        })
    }else{ 
        console.error("Passed parameters are invalid"); 
        res.status(400).json({
            status : "failure",
            payload  : {
                message : "Passed parameters for voting are invalid"

            }
        })
    } 
    return;
}