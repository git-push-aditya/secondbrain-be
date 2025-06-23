import { createClient } from 'redis'; 
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

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


const youtubeTranscriptHandler = async (content : string) => {
    const url = `https://video.google.com/timedtext?lang=en-US&v=${content}`;
    console.log(url);

    try {
        const {data} = await axios.get(url);
        console.log(data);
        if(!data) return [];
        console.log('reached');

        const result = await parseStringPromise(data);
        const texts = result.transcript.text || [];
        console.log('reached 2');

        return texts.map((t: any) => t._ || '');

    }catch(e){
        console.error('caption fetch failed!!', e);
        return [];
    }
}





const handleScrape = async ({content} : {content : any}) : Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if(!content.key){
        console.log('msisig info');
    }
    console.log(content.element);
    //check if content.type == youtube

    const transcript = await youtubeTranscriptHandler(content.element);
    console.log(transcript);

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