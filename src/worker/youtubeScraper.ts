import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import axios from 'axios';

puppeteer.use(StealthPlugin());


const getTranscriptViaPuppeteer = async (videoUrl: string) => {
    try {
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox']
        })

        const page = await browser.newPage();

        await page.goto('https://tactiq.io/tools/youtube-transcript', { waitUntil: 'networkidle2' });

        await page.type('input#yt-2', videoUrl);

        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('input[type="submit"]')) as HTMLInputElement[];
            const btn = buttons.find(b => b.value?.toLowerCase().includes('video transcript'));
            btn?.click();
        });


        await page.waitForSelector('#transcript ul li a', { timeout: 60000 });

        const transcript = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#transcript ul li a'))
                .map(a => (a as HTMLElement).innerText.trim()) // or HTMLAnchorElement
                .filter(text => text.length > 0)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
        });
            


        await browser.close();
        const refinedTranscript = transcript.length > 7000 ? transcript.slice(0,7000) : transcript;
        return refinedTranscript;

    } catch (e) {
        console.error('error spinning up a puppeteer : check \nError :', e);
        return '';
    }

}




const getYoutubeTranscript = async (videoUrl: string) => {
    try { 
        const puppetEerTranscript = await getTranscriptViaPuppeteer(videoUrl);
        return puppetEerTranscript;
    } catch (e) {
        console.error('Error getting transcript via tactiq or puppeteer..\nError', e);
        return '';
    }
}

const extractVideoId = (videoUrl : string) => {
  const regex = /(?:youtube\.com\/.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const match = videoUrl.match(regex);
  return match ? match[1] : null;
};


const getYoutubeMetaData = async (videoUrl : string ) => { 
    try{
        const API_KEY = process.env.YOUTUBE_API_KEY;
        const videoId = extractVideoId(videoUrl);

        const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${API_KEY}`)
        
        const video = response.data.items[0];
        let description = video.snippet.description.replace(/\s+/g,' ').trim(); 

        const metaData = {
            title: video.snippet.title,
            description: description,
            channel: video.snippet.channelTitle, 
            publishedAt: video.snippet.publishedAt
        };

        return metaData;
    }catch(e){
        console.log('Error hitting youtube v3 data api : \n',e);
        return '';
    }

}
 

const scrapeYoutubeVideoData = async (videoUrl:string) => {
    try{ 
        let youtubeMetaData ;

        try{
            youtubeMetaData = await getYoutubeMetaData(videoUrl);
        }catch(e){
            console.error('Error fetching MetaData');
            youtubeMetaData = '';
        }
        
        return {
            status : 'success',
            payload :{ 
                metadata : youtubeMetaData 
            } 
        };

    }catch(e){
        console.error('Error collecting youtube metadat for given url :',videoUrl);
        console.error('Specific Error : ',e);
        return {
            status : 'failure',
            payload : {
                message : "error scraping data; pushing to error queue",
                errro: e
            }
        };
    }

}

export default scrapeYoutubeVideoData;