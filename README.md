# 🚀 SecondBrain — Backend

[Live Site » secondbrain.notaditya.dev](https://secondbrain.notaditya.dev)

A production-focused backend for **SecondBrain** — an AI-powered content management system that saves, semantically organizes, and enables conversational retrieval of links, posts, and articles.  
This repo provides the API server, background workers, queueing, scraping, embedding, and vector-search integration required for the full product.

---

![Node.js](https://img.shields.io/badge/Node-%3E=18-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-%3E=5-blue) ![Docker](https://img.shields.io/badge/Docker-enabled-blue) ![Prisma](https://img.shields.io/badge/Prisma-ready-purple)

## 🔎 What this service does (short)
- Exposes REST APIs for ingestion, retrieval, and user/session management.
- Performs web scraping (Cheerio + jsdom + Readability) and content extraction.
- Enqueues ingestion jobs in Redis and processes them with worker processes.
- Generates vector embeddings (Cohere) and stores them in Pinecone for semantic search.
- Persists metadata and app state with Prisma (Neon DB / PostgreSQL).
- Dockerized and CI/CD-ready (GitHub Actions workflows included).
- Implements a **scalable server–worker architecture** using Redis queues for distributed and asynchronous job execution.
- Generates shareable collections — creates deep-copy links of user-curated social media content for easy sharing.
- Community collaboration — enables multiple members to share, upvote, and downvote relevant links within a community.
---

## 🧭 Key features
- High-throughput ingestion pipeline (Redis queue + workers).
- Scraping and content extraction from arbitrary pages (Readability, Cheerio).
- Vector embedding + semantic search (Cohere → Pinecone).
- Session and auth handling (JWT + secure cookies).
- Cron jobs for periodic maintenance and scraping.
- Production-ready deployment patterns (Docker, Nginx reverse proxy, GitHub Actions).

---

## 📁 Project structure (high-level)
```bash
.
├─ .github/workflows/         # CI / CD workflows
├─ dist/                      # Compiled JS (production)
├─ prisma/                    # Prisma schema & migrations
├─ src/
│  ├─ controllers/            # Request handlers
│  ├─ routes/                 # Express routes
│  ├─ middlewares/            # Auth, validation, error handling
│  ├─ utils/                  # Helpers: scraping, parsing, logging
│  ├─ jobs/                   # Cron jobs, scheduled tasks
│  ├─ worker/                 # Background worker code (queue processing)
│  ├─ prismaClient.ts         # Prisma client initialization
│  └─ server.ts               # Express app entrypoint
├─ Dockerfile
├─ docker-compose.yml
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## 🛠 Tech stack (concise)
- Runtime: Node.js + TypeScript  
- Web framework: Express  
- ORM: Prisma (Neon / PostgreSQL)  
- Queue: Redis (jobs and messaging)  
- Worker pattern: Node worker process (concurrently runs server + worker)  
- Embeddings: Cohere LLM  
- Vector DB: Pinecone  
- Scraping / parsing: Cheerio, jsdom, @mozilla/readability  
- Deployment: Docker / docker-compose, GitHub Actions (CI/CD)

---

# Architecture:

<img width="1132" height="739" alt="image" src="https://github.com/user-attachments/assets/9fd367a2-35f2-4ed6-be14-e250054c4064" />

---
## ⚙️ Environment variables

Create a `.env` file in the project root (example keys below). **Do not** commit secrets.
```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"
REDIS_URL=redis://:password@host:port
COHERE_API_KEY=your_cohere_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=secondbrain-index
JWT_SECRET=your_jwt_secret
```
---

## 🚀 Local development (recommended)

1. Install dependencies
```
npm install
```
2.Setup Prisma (generate client)
```
npx prisma generate
# For development migrations:
npx prisma migrate dev --name init
# OR if you prefer pushing schema (non-destructive):
npx prisma db push
```

3.Start services locally (server + worker concurrently)
```
npm run dev
# This runs:
# nodemon --watch src --exec ts-node ./src/server.ts
# nodemon --watch src/worker --exec ts-node ./src/worker/worker.ts
```

## 🐳 Using Docker (recommended for production parity)

You can containerize and run the backend using Docker for a consistent local environment that mirrors production.

### 🧩 Build & Run with Docker Compose

This will start the **server**, **worker**, **Redis**, and other services (as defined in your `docker-compose.yml`):

```bash
docker compose up --build
```

## 🔁 CI / CD

This repository includes **GitHub Actions** workflows (located in `.github/workflows/`) for continuous integration and deployment.

The CI/CD pipeline automatically:

- 🏗️ Builds the TypeScript project  
- 🐳 Creates and pushes a Docker image  
- 🚀 Deploys the latest build to the configured environment  

> ⚙️ Make sure your repository **secrets** include all required environment variables (e.g., database credentials, Redis URL, API keys) for successful deployment.

---

## 👨‍💻 Author

**Aditya Dubey**  
📧 [adityadubey0034@gmail.com](mailto:adityadubey0034@gmail.com)  
🌐 [secondbrain.notaditya.dev](https://secondbrain.notaditya.dev)  
🐙 [GitHub](https://github.com/git-push-aditya)

> *“Code with purpose, build with clarity, and ship with impact.”*
