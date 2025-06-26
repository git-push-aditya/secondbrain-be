import axios from "axios";

const scrapeRedditPost = async (url : string) => { 
    const cleanedApi = url.split('/?')[0] + '.json'; 
    try{
        const {data} = await axios.get(cleanedApi);
        let post; //post details
        if(data[0]?.data?.children[0]?.kind === 't3'){
            let title = data[0]?.data?.children[0]?.data?.title || '';
            let subText = data[0]?.data?.children[0]?.data?.selftext || '';
            let subreddit =data[0]?.data?.children[0]?.data?.subreddit || '';
            post = {
                subreddit,title,subText
            } 
        }
        const firstComment = data[1].data.children[0].data.body || ''; //first comment
        let repliesToFirstComment : string[]= []; //replies to first comment
        data[1].data.children[0].data.replies.data.children.map((el:any)=>{
            repliesToFirstComment.push(el?.data?.body || '')
        }) 
        repliesToFirstComment =repliesToFirstComment.filter((el) => el !== '[removed]' && el !== '[deleted]'); 
        return {
            status : "success",
            payload: {
                message: "post scraped successfully",
                post,
                firstComment,
                repliesToFirstComment
            } 
        }

    }catch(e){
        console.error('\n\nError scraping reddit site : ',cleanedApi);
        console.error('The error : ',e);
        console.error('This post is being pushed to error queue!!');
        return {
            status :'failure',
            payload: {
                message : 'Pushing element to error queue'
            }
        }
    } 
}

export default scrapeRedditPost;