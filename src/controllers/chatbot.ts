import { Request, Response } from "express"; 

export const chatbot = async (req: Request, res: Response) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    res.status(200).json({
      status: "success",
      payload: {
        message: "That's correct!",
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error",payload:{ message: "Internal Server Error"} });
  }
};
