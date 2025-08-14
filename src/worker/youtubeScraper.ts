import axios from 'axios';

 
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