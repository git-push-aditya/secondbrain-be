import axios from 'axios';
import * as cheerio from 'cheerio'; 

const scrapeTweets = async (scrapeUrl : string,attempt = 0) => {
    if(attempt > 5 ){
        return {
            status : 'failure',
            payload : {
                message: 'recurring waiting period'
            }
        }
    }
    const url = new URL(scrapeUrl);
    const val = url.pathname.slice(1);
    const pingUrl = `https://nitter.net/${val}#m`
    try{
        const {data} = await axios.get(pingUrl,{
            headers :{
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        const $ = cheerio.load(data);

        const rawTweet = $('.tweet-content.media-body').first().text().trim(); 
        const rawTweet2 = rawTweet.replace(/\s+/g,' ').trim() || '';
        const refinedTweet = rawTweet2.length > 7000 ? rawTweet2.slice(0,7000) : rawTweet2;

        const hashTags:string[] = [];
        $('.tweet-content.media-body a').each((_,el)=>{
            const tag = $(el).text();
            if(tag.startsWith('#')) hashTags.push(tag);
        })
        
        return {
            status : 'success',
            payload :{
                message : 'scraped!!',
                body : refinedTweet,
                tags : hashTags || []
            }
            
        }

    }catch(e:any){
        if (e.response?.status === 429) {
            const retryAfter = Number(e.response.headers['retry-after'] || 10) * 1000;
            console.warn(`Rate limited. Waiting for ${retryAfter / 1000} seconds...`);

            if((retryAfter/1000) > 15){
                console.log('WAIT_PERIOD_LIMIT');
                return {
                    status : 'failure',
                    payload: {
                        message : 'Intollerable waiting period; push to error queue'
                    }
                }
                
            }else{
                console.log(`Retrying scrape (Attempt ${attempt + 1})...`);
                await new Promise((resolve) => setTimeout(resolve,retryAfter + 2000));
                return scrapeTweets(scrapeUrl, attempt+1);
            }            
        }else if (e.response?.status === 404) {
            return {
                status: 'failure',
                payload: {
                    message: 'Tweet not found (404)'
                }
            }
        }else{
            console.error(e);
            return {
                status : 'failure',
                payload :{
                    message : 'dont Know;check logs'
                }
                
            }
        }
    }
}

export default scrapeTweets;