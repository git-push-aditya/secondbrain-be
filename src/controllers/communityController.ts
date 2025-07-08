import { Request, Response } from "express";
import { generateHash } from "../utils/generateHash";
import client from "../prismaClient";
import bcrypt from 'bcrypt';




export const createCommunity = async (req : Request,res : Response) => {
    
    try{ 
        const { userId, name, descp ,emailLead, membersCanPost, password } = req.body;
        //return secondbrain:communityname@hash
        const hash = generateHash();

        const hashedPassword = await bcrypt.hash(password.trim(), 10)

        const createdCommunity = await client.community.create({
            data : {
                hash,
                name,
                descp,
                emailLead,
                membersCanPost,
                password : hashedPassword,
                founderId : userId
            }
        })

        const community = `secondbrain:${name}@${hash}`;

        res.json({
            status : "success",
            payload : {
                message : "community created successfully",
                community,
                communityId : createdCommunity.id,
                password : password.trim()
            }
        })
    }catch(e){
        console.error("Some error occured\n\n");
        console.error(e);
        res.status(400).json({
            status: "failure",
            payload :{
                message : " server error creating a community. Retry later."
            }
        })
    }
}


export const joinCommunity = async (req : Request,res : Response) => {
    const { communityId, password, userId} = req.body;
    try{
        const hash = communityId.trim().split('@')[1];
        const communityCred = await client.community.findFirst({
            where : {
                hash
            },select :{
                name : true,
                id : true,
                descp : true,
                password : true,
                membersCanPost  : true,
                founder : {
                    select : {
                        id  : true,
                        userName : true
                    }
                }
            }
        })

        if(communityCred === null){
            res.status(404).json({
                status : "failure",
                payload : {
                    message : "community doesnt exist"
                }
            })
            return;
        }else{

            const verify = await bcrypt.compare(password , communityCred.password);

            if(verify){ 

                await client.communityMembers.create({
                    data : {
                        communityId : communityCred.id,
                        memberId : userId
                    }
                })


                res.status(200).json({
                    status : "success",
                    payload : {
                        message : "joined community successfully!",
                        communityId : communityCred.id,
                        communityName : communityCred.name,
                        communitDescription : communityCred.descp,
                        membersCanPost : communityCred.membersCanPost,
                        foundersName : communityCred.founder.userName
                    }
                })


            }else{
                res.status(401).json({
                    status : "failure",
                    payload : {
                        message : "Unauthorized !! invalid credentials"
                    }
                })
                return;
            }
        }
    }catch(e){
        console.error("Some runtime error\n\n");
        console.error(e);
        res.status(400).json({
            status : "failure",
            payload : {
                message : "Error joining the community, Internal server errro"
            }
        })
        return;
    }

}
 