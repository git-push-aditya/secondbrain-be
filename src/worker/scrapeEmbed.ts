import { createClient } from 'redis';
import scrapeYoutubeVideoData from './youtubeScraper';
import scrapeTweets from './twitterScrapper';
import scrapeRedditPost from './redditScrapper';
import getWebPageData from './webScraper';

const redisClient = createClient();

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
 
}
 



const handleScrape = async ({card,type} : {card : cardContent,type :string}) : Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 1000)); 

    let data;

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

    console.log(data); 
    return data;
}   






const startWorker = async() => {
    try{
        await redisClient.connect();
        while(1){
            let content;
            try{
                content = await redisClient.brPop('embedQueue',0);
                const card = JSON.parse(content?.element!); 
                const scrapedData  = await handleScrape({card,type :card?.type}) ;
                if(scrapedData.status === 'failure'){
                    throw new Error;
                }else{
                    console.log('\n\n\nScraped successfully !!!')
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