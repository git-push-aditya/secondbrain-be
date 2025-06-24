import { createClient } from 'redis';
import scrapeYoutubeVideoData from './youtubeScraper';
import scrapeTweets from './twitterScrapper';

const redisClient = createClient();

interface handleScrapeType {
    content : {
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
}

//{content} : handleScrapeType 



const handleScrape = async ({content} : {content : any}) : Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if(!content.key){
        console.log('msisig info');
        return '';
    }
//use switch case :: neater than if ladder
//if(content.type === 'YOUTUBE')
    //const data = await scrapeYoutubeVideoData(content.element);
//if(content.type === 'TWITTER')
    console.log(content.element)
    const data = await scrapeTweets(content.element)

    console.log(data);
    

    return "job done";
}   






const startWorker = async() => {
    try{
        await redisClient.connect();
        while(1){
            let content;
            try{
                content = await redisClient.brPop('embedQueue',0);
    //            const content = JSON.parse(data?.element!); 
                const scrapedData  = await handleScrape({content})
                console.log(scrapedData);
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