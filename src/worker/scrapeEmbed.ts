import { createClient } from 'redis';
import scrapeYoutubeVideoData from './youtubeScraper';
import scrapeTweets from './twitterScrapper';
import scrapeRedditPost from './redditScrapper';
import getWebPageData from './webScraper';
import { CohereClient } from 'cohere-ai';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv'; 
dotenv.config();
//need to do this before spinning up puppeteer: npx puppeteer browsers install chrome
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
    return `Subreddit : ${data?.post?.subreddit || ''} Tittle : ${data?.post?.title || ''} Post : ${data?.post?.subText || ''} Top Comment:${data?.firstComment || ''}  Replies:${data?.repliesToFirstComment.filter(Boolean).join(' ')}`.replace(/\s+/g,' ').trim();
}

const flatternTwitterData = (data : any) => {
    return `Tweet body : ${data?.body || ''} hashtags : ${data?.tags.map((el: any) => el) || ''} `.replace(/\s+/g,' ').trim()
}

const flatternYoutubeData = (data:any) => { 
    const transcript = data.transcript.length > 8000 ? data.transcript.slice(0,8000) : data.transcript;
    return `Transcript : ${transcript} Metadata : { title: ${data?.metadata?.title} description :${data?.metadata?.description} channel : ${data?.metadata?.channel}}`.replace(/\s+/g,' ').trim(); 
}

const flatterWebData = (data:any) => {
    return `web content : ${data.content} title: ${data.title.replace(/\s+/g,' ').trim()} author: ${data.author} website: ${data.website} `
}

//to check the insta 
const flatternInstagramContent = (data : any) =>{
    return`hyperlink :${data.hyperlink} note: ${data.note} title : ${data.title} tags : ${data.tags.map((el :any) => el.title)}`.trim();
}

//just add card details ass well to the scraped data 
const createAndReturnEmbeddings = async ({data,type} : {data: any,type:string}) => {
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
            console.log(filteredData)
            break;
        case 'WEB':
            filteredData = flatterWebData(data.payload);
            console.log(filteredData)
            break;
        case 'INSTAGRAM':
            filteredData= flatternInstagramContent(data);
            break;
        default :
            console.error('Invalid Tpe');
            break;
    }
    

    try{
        const embed = await embedClient.v2.embed({
            texts: [filteredData],
            model: 'embed-v4.0',
            outputDimension: 1024,
            inputType: 'search_document',
            embeddingTypes: ['float']
        })

 
        console.log(embed.meta?.billedUnits?.inputTokens+'\n') 
        return {
            status : 'success',
            payload : {
                embeddings : embed.embeddings
            }
        };
    }catch(e){
        console.error('Error creataing embedding \n');
        console.error(e);
        return{
            status: 'failure'
        }
    }
 
}   





//card : cardContent
const handleScrapeAndPostEmbeddings = async ({card,type} : {card : any,type :string}) : Promise<any> => {

    let data;

    try{
        switch(type){
            case 'WEB':
                //everywhere below : card.hyperlink instead of card okay..
                data = await getWebPageData(card)
                break;
            case 'REDDIT':
                data = await scrapeRedditPost(card);
                break;
            case 'TWITTER':
                data = await scrapeTweets(card)
                break;
            case 'YOUTUBE':
                data = await scrapeYoutubeVideoData(card)
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
        console.log(data)

        //note : userId  => card.id   //card id(post gress) used to give id to corresponding embeddign
        let id :number = 675;
        const userId = 22;
        const embeddings = await createAndReturnEmbeddings({data,type}); 

        //pushing embedding to db
        if(embeddings.status === 'success'){
            console.log(embeddings.payload?.embeddings?.float?.[0])
            await store.upsert([
                {
                    id: `${id}`,              // Use content ID from your DB
                    values: embeddings.payload?.embeddings?.float?.[0],             // Your embedding vector (1024 floats)
                    metadata: {
                        userId: userId            // For filtering per user
                    }
                }
            ]);
 

            id += 1; 
 

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
        await redisClient.connect();
        while(1){
            let content;
            try{
                content = await redisClient.brPop('embedQueue',0);
                //const card = JSON.parse(content?.element!); 
                const card = content?.element;
                const type = 'YOUTUBE';
                //const scrapedData  = await handleScrape({card,type :card?.type}) ;
                const result  = await handleScrapeAndPostEmbeddings({card,type }) ;
                if(result.status === 'failure'){
                    throw new Error;
                }else{
                    console.log('\n\n\n Done and dusted fr !!')
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