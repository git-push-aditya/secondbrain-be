import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

const client = new PrismaClient();

cron.schedule('0 2 * * *', async () => {
    try{
        const result = await client.tags.deleteMany({
            where:{
                content :{
                    none : {}
                }
            }
        })
        console.log(`Deleted ${result.count} unused tags.`);
    }catch(e){
        console.error(`Error during clenup job : `,e)
    }
})