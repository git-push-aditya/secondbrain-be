import express from "express";
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import cookieParser from 'cookie-parser';
import { meZod } from "./middlewares/zodMiddleware"; 
import verifyJwt from "./middlewares/jwstAuth";
import { restoreMe } from "./controllers/me";
import helmet from 'helmet';
import dotenv from 'dotenv';
dotenv.config();


const app = express();



//create a new endpoint in users route such that tagged content are fetched only if a the content is tagged with all the mentioned tags    //i think the union field is for that in the tagged content endpoint

//our current sharable brain does is it shares the whole brain;but what if user only want to create a brain with all the relevent links and share it(i.e selected subset// a small mini brain there for sharing and not the whole brain// kinda like publishing a chapter and not hte whole book)


app.use(cors({
  origin: "http://localhost:5173", 
  credentials: true,               
}));
app.use(helmet());

app.use(cookieParser());
app.use(express.json());

app.use('/auth',authRoutes);
app.use('/user',userRoutes);

app.get('/me',meZod,verifyJwt,restoreMe);

app.listen(2233, () => {
    console.log("Server started at port 2233");
});

import './jobs/cleanUnusedtags';