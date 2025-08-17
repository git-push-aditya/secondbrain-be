import { Request, Response } from "express"; 
import { CohereClientV2 } from "cohere-ai";
import dotenv from 'dotenv'; 
dotenv.config(); 

const cohere = new CohereClientV2({
  token : process.env.CHAT_API_KEY
})

const systemMessage : string = "you are to respond to user query well within 30-50 words"

export const chatbot = async (req: Request, res: Response) => {
  try { 
    const { lastSevenMessages } = req.body;


    const response = await cohere.chat({
      model: 'command-a-03-2025',
      messages: [
        {
          role : "system",
          content : systemMessage
        },
        ...lastSevenMessages
      ],
    });

    res.status(200).json({
      status: "success",
      payload: {
        chatId : response.id,
        message :   response.message?.content?.[0]?.text ?? "Sorry, I wasn’t able to generate a respons"
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error",payload:{ message: "Internal Server Error"} });
  }
};
