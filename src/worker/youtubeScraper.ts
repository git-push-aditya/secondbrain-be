import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import axios from 'axios';


puppeteer.use(StealthPlugin());

const getTranscriptViaPuppeteer = async (videoUrl: string) => {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox']
        })

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });;

        await page.goto('https://tactiq.io/tools/youtube-transcript', { waitUntil: 'networkidle2' });

        await page.type('input#yt-2', videoUrl);

        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('input[type="submit"]')) as HTMLInputElement[];
            const btn = buttons.find(b => b.value?.toLowerCase().includes('video transcript'));
            btn?.click();
        });


        await page.waitForSelector('#transcript ul');

        const transcript = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#transcript ul li'))
                .map(li => li.querySelector('a')?.innerText.trim())
                .filter(Boolean)
                .join(' ').replace(/\s+/g, ' ').trim();
        });

        await browser.close();
        return transcript;

    } catch (e) {
        console.error('error spinning up a puppeteer : check \nError :', e);
        return '';
    }

}




const getTranscriptApi = async (videoUrl: string) => {

    try {
        const response = await axios.post('https://tactiq-apps-prod.tactiq.io/transcript', {
            langCode: 'en',
            videoUrl
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://tactiq.io',
                'Referer': 'https://tactiq.io/',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
            }
        }
        );

        const transcript = response.data?.captions?.map((c: any) => c.text).join(' ');
        return transcript;
    } catch (e) {
        console.error("Erreg getting data from tactiqApi; check api");
        return '';
    }

};

const getYoutubeTranscript = async (videoUrl: string) => {
    try {
        const transcript = await getTranscriptApi(videoUrl);
        if (transcript === '') {
            const puppetEerTranscript = await getTranscriptViaPuppeteer(videoUrl);
            if (puppetEerTranscript === '') {
                return '';
            } else {
                return puppetEerTranscript;
            }
        }

        return transcript;
    } catch (e) {
        console.error('Error getting transcript via tactiq or puppeteer..\nError', e);
        return '';
    }
}


