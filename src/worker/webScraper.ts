import axios from 'axios';
import {JSDOM}  from 'jsdom';
import { Readability } from '@mozilla/readability';

const getWebPageData = async (url : string) => {
    try{
        const headers = {
            'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'DNT': '1', // Do Not Track
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
        };

        const res = await axios.get(url, {headers});

        const html = res.data;

        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        const rawTextContent = article?.textContent;
        let refinedContent = rawTextContent?.replace(/\s+/g,' ').trim() || '';
        refinedContent = refinedContent.length > 7000 ? refinedContent.slice(0,7000) : refinedContent;
        
        return {
            status : 'success',
            payload : {
                message : 'parsed important data success fully',
                content : refinedContent.replace(/\s+/g,' ').trim() || '',
                title : article?.title || '',
                author : article?.byline || '',
                website: article?.siteName || ''
            }
        }
    }catch(e){
        console.error("Website data fetching failed; pushing to error Queue\n\n")
        console.error('Error occured \n\n',e)
        return {
            status : 'failure',
            payload: {
                message : 'Something happened',
                error: e
            }
        }

    }
    
}

export default getWebPageData;