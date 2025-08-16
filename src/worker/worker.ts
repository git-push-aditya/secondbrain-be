import { createClient } from 'redis';
import scrapeYoutubeVideoData from './youtubeScraper';
import scrapeTweets from './twitterScrapper';
import scrapeRedditPost from './redditScrapper';
import getWebPageData from './webScraper';
import { CohereClient } from 'cohere-ai';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv'; 
dotenv.config(); 

const redisClient = createClient();

const embedClient = new CohereClient({
    token : process.env.EMBED_API_KEY
})

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_VDB_API_KEY || '' 
});

const store = pinecone.index('secondbrain');


interface cardContent { 
    tags: {
        id: number;
        title: string;
    }[];
    type: 'WEB' | 'YOUTUBE' | 'TWITTER' | 'REDDIT' | 'INSTAGRAM';
    title: string;
    hyperlink: string;
    note: string | null;
    id: number;
    createdAt: Date | null;
    userId: number;
}

const flattenRedditData = (data : any) => {
    const flatternRedditDataRaw = `Subreddit : ${data?.post?.subreddit || ''} Tittle : ${data?.post?.title || ''} Post : ${data?.post?.subText || ''} Top Comment:${data?.firstComment || ''}  Replies:${data?.repliesToFirstComment.filter(Boolean).join(' ')}`.replace(/\s+/g,' ').trim();
    return flatternRedditDataRaw.length > 10000 ? flatternRedditDataRaw.slice(0,10000) : flatternRedditDataRaw;
}

const flatternTwitterData = (data : any) => {
    return `Tweet body : ${data?.body || ''} hashtags : ${data?.tags.map((el: any) => el) || ''} `.replace(/\s+/g,' ').trim()
}

const flatternYoutubeData = (data:any) => { 
    return ` Metadata : { title: ${data?.metadata?.title} description :${data?.metadata?.description} channel : ${data?.metadata?.channel}}`.replace(/\s+/g,' ').trim(); 
}

const flatterWebData = (data:any) => {
    return `web content : ${data.content} title: ${data.title.replace(/\s+/g,' ').trim()} author: ${data.author} website: ${data.website} `
}

//to check the insta 
const flatternInstagramContent = (data : any) =>{
    return`hyperlink :${data.hyperlink} note: ${data.note} title : ${data.title} tags : ${data.tags.map((el :any) => el.title)}`.trim();
}


const createAndReturnEmbeddings = async ({data,type} : {data: any,type:string}) => {


    try{

        let filteredData : string = '';
        switch(type){
            case 'REDDIT':
                filteredData = flattenRedditData(data.payload);
                break;
            case 'TWITTER':
                filteredData = flatternTwitterData(data.payload);
                break;
            case 'YOUTUBE':
                filteredData = flatternYoutubeData(data.payload); 
                break;
            case 'WEB':
                filteredData = flatterWebData(data.payload); 
                break;
            case 'INSTAGRAM':
                filteredData= flatternInstagramContent(data);
                break;
            default :
                console.error('Invalid Tpe');
                break;
        }
                
        const embed = await embedClient.v2.embed({
            texts: [filteredData],
            model: 'embed-v4.0',
            outputDimension: 1024,
            inputType: 'search_document',
            embeddingTypes: ['float']
        })

  
        return {
            status : 'success',
            payload : {
                embeddings : embed.embeddings
            },
            filteredData
        };
    }catch(e){
        console.error('Error creataing embedding \n');
        console.error(e);
        return{
            status: 'failure'
        }
    }
 
}   





const handleScrapeAndPostEmbeddings = async ({card,type} : {card : cardContent,type :string}) : Promise<any> => {

    let data;

    try{
        switch(type){
            case 'WEB': 
                data = await getWebPageData(card.hyperlink)
                break;
            case 'REDDIT':
                data = await scrapeRedditPost(card.hyperlink);
                break;
            case 'TWITTER':
                data = await scrapeTweets(card.hyperlink)
                break;
            case 'YOUTUBE':
                data = await scrapeYoutubeVideoData(card.hyperlink)
                break;
            case 'INSTAGRAM':
                data = {
                    tags : card.tags,
                    title : card.title,
                    hyerlink : card.hyperlink,
                    note : card.note
                }
                break;
            default : 
                console.log('Undefined type');
                break;
        }  
 
        let contentId = card.id;
        const userId = card.userId;

        const embeddings = await createAndReturnEmbeddings({data,type}); 

        //pushing embedding to db
        if(embeddings.status === 'success'){ 
            await store.upsert([
                {
                    id: `${contentId}`,              // Use content ID from your DB
                    values: embeddings.payload?.embeddings?.float?.[0],// Your embedding vector (1024 floats)
                    metadata: {
                        userId: userId,            // For filtering per user
                        contentId : contentId,
                        content : embeddings?.filteredData ?? ""
                    }
                }
            ]);

        }else{
            console.error('\n\nissue: creating embedding\n\n');
        }

        return{
            status : 'success'
        }

    }catch(e){
        console.error('Error creating embedding or pushing to pinecone\n');
        console.error(e);
        return{
            status: 'failure'
        }
    }
    
}   






const startWorker = async() => {
    try{
        console.log("worker started")
        await redisClient.connect();
        while(1){
            let content;
            try{
                content = await redisClient.brPop('embedQueue',0); 
                const card : cardContent = JSON.parse(content?.element!);  
                const type = card?.type;  
                const result  = await handleScrapeAndPostEmbeddings({card,type }) ;

                if(result.status === 'failure'){
                    throw new Error;
                }
            }catch(e){
                console.error("Some error occured scraping the content or ambedding the content; pushed to error queue",e,content);
                redisClient.lPush('errorQueue',content?.element || JSON.stringify(content));
            }
        }        

    }catch(e){
        console.error('Error connecting to redis client or something else');
        console.error(e);
    }
}


startWorker();