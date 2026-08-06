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
import client from "./prismaClient"


dotenv.config();

 

process.on("SIGINT", async () => {
  await client.$disconnect();
  console.log("signing off")
  process.exit(0);
});


const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://secondbrain.notaditya.dev',
  ...(process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()).filter(Boolean) || [])
];

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
  maxAge: 86400,
}));

app.use(helmet());

app.use(cookieParser());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/user', userRoutes); 

app.get('/me', meZod, verifyJwt, restoreMe);

const startServer = () => {
  const port = process.env.PORT || 2233;
  app.listen(port, () => {
    console.log(`Server started at port ${port}`);
  });
}

startServer();
import './jobs/cleanUnusedtags';