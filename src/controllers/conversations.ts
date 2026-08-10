import { Request, Response } from 'express';
import client from '../prismaClient';
import handleError from '../utils/handleErrors';

export const getConversations = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;

        const conversations = await client.conversation.findMany({
            where: { userId },
            select: { id: true, title: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' }
        });

        res.status(200).json({
            status: "success",
            payload: { conversations }
        });
    } catch (err) {
        handleError(err, res);
    }
};

export const getConversation = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        const conversationId = Number(req.query.conversationId);

        // single query doubles as the ownership check: a foreign or missing id
        // both resolve to null, so there's no separate lookup before this one
        const conversation = await client.conversation.findFirst({
            where: { id: conversationId, userId },
            select: {
                id: true,
                title: true,
                messages: {
                    orderBy: { createdAt: 'asc' },
                    select: { id: true, role: true, content: true, contentRefId: true, createdAt: true }
                }
            }
        });

        if (!conversation) {
            res.status(404).json({
                status: "failure",
                payload: { message: "Conversation not found" }
            });
            return;
        }

        res.status(200).json({
            status: "success",
            payload: conversation
        });
    } catch (err) {
        handleError(err, res);
    }
};
