import { Request, Response } from "express";
import { CohereClientV2, CohereClient } from "cohere-ai";
import { Pinecone } from '@pinecone-database/pinecone';
import client from "../prismaClient";
import dotenv from 'dotenv';
dotenv.config();

const embedClient = new CohereClient({
  token: process.env.EMBED_API_KEY
})

const cohere = new CohereClientV2({
  token: process.env.CHAT_API_KEY
})

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_VDB_API_KEY || ''
});

const store = pinecone.index('secondbrain');

interface cardData {
  title: string;
  note: string | null;
  id: number;
  type: string;
  createdAt: Date | null;
  tags: {
    tag: {
      title: string;
    };
  }[];
}






const systemMessage: string = "You are a helpful assistant. Use past chats/notes if given, else answer normally. Be clear, concise, and accurate";


const buildContextString = (context: string, score: number, cardData: cardData | null): string => {
  return `Context: ${context}, Confidence: ${score}, Note: title=${cardData?.title}, tags : ${cardData?.tags.map((el) => el.tag.title).join(" ")}`
}



export const chatbot = async (req: Request, res: Response) => {
  try {
    const { lastSevenMessages, userId } = req.body;

    const refindMessages = lastSevenMessages.map((el: any) => ({
      role: el.role,
      content: el.content,
    }));

    const filteredData = refindMessages[refindMessages.length - 1].content;

    const embed = await embedClient.v2.embed({
      texts: [filteredData],
      model: 'embed-v4.0',
      outputDimension: 1024,
      inputType: 'search_query',
      embeddingTypes: ['float']
    })

    const embeddings = embed.embeddings.float?.[0] ?? [];

    const results = await store.query({
      vector: embeddings,
      topK: 1,
      includeMetadata: true,
      filter: {
        userId: userId,
      },
    });


    const result = results.matches.map((content) => ({
      id: content.id,
      score: content.score,
      metadata: content.metadata
    }))

    const contentData = await client.content.findFirst({
      where: {
        id: parseInt(result[0].id),
      }, select: {
        title: true,
        note: true,
        hyperlink: true,
        id : true,
        createdAt : true,
        tags: {
          select: {
            tag: {
              select: {
                title: true
              }
            }
          }
        },
        type: true
      }
    })

    const rawContext = result[0].metadata?.content ?? " ";
    const score = result[0].score;

    const context = buildContextString(rawContext as string, score ?? 0, contentData);


    const response = await cohere.chat({
      model: 'command-a-03-2025',
      messages: [
        {
          role: "system",
          content: `${systemMessage}\n ${context}`
        }, {
          role: "user",
          content: refindMessages[refindMessages.length - 1].content
        }

      ],
    });
    // removed : ...refindMessages  (temporarily for testing)
    res.status(200).json({
      status: "success",
      payload: {
        chatId: response.id,
        message: response.message?.content?.[0]?.text ?? "Sorry, I wasn't able to generate a response",
        content: contentData
      },
    });
  } catch (err) {
    console.error("Some error occured here : ", err)
    res.status(500).json({ status: "error", payload: { message: "Internal Server Error" } });
  }
};
