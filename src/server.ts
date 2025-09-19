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
import { createClient } from 'redis';
import client from "./prismaClient"


dotenv.config();

 

process.on("SIGINT", async () => {
  await client.$disconnect();
  console.log("signing off")
  process.exit(0);
});


const redisClient = createClient({
  url : 'redis://queue:6379'
});
redisClient.on('error', (err) => {
  console.error('redis client error : ', err);
})
redisClient.on('reconnecting', () => {
  console.warn('Reconnecting to Redis...');
});


const app = express();

const allowedOrigins = [ 'http://localhost:5173','https://secondbrain.notaditya.dev'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) { 
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) { 
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(helmet());

app.use(cookieParser());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/user', userRoutes); 

app.get('/me', meZod, verifyJwt, restoreMe);

const startServer = async () => {
  try {
    await redisClient.connect();
    console.log('successfully connected to redis client');
    app.listen(2233, () => {
      console.log("Server started at port 2233");
    });
  } catch (e) {
    console.error('something happened :', e);
  }
}

startServer();
import './jobs/cleanUnusedtags';
export default redisClient;