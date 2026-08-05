# 🚀 SecondBrain — Backend

[Live Site » secondbrain.notaditya.dev](https://secondbrain.notaditya.dev)

A production-focused backend for **SecondBrain** — an AI-powered content management system that saves, semantically organizes, and enables conversational retrieval of links, posts, and articles.
This repo provides the API server, scraping, embedding, and vector-search integration required for the full product.

---

![Node.js](https://img.shields.io/badge/Node-%3E=18-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-%3E=5-blue) ![Docker](https://img.shields.io/badge/Docker-enabled-blue) ![Prisma](https://img.shields.io/badge/Prisma-ready-purple)

## 🔎 What this service does (short)
- Exposes REST APIs for ingestion, retrieval, and user/session management.
- Performs web scraping (Cheerio + jsdom + Readability) and content extraction.
- Runs scraping + embedding as background work in the same process, right after the API response is sent — no separate queue or worker service.
- Generates vector embeddings (Cohere) and stores them in Pinecone for semantic search.
- Persists metadata and app state with Prisma (Supabase / PostgreSQL).
- Dockerized, deployed on Render via a Blueprint (`render.yaml`).
- Generates shareable collections — creates deep-copy links of user-curated social media content for easy sharing.
- Community collaboration — enables multiple members to share, upvote, and downvote relevant links within a community.
---

## 🧭 Key features
- Single always-on web process: request handling and background scrape/embed work share one Node process (fire-and-forget after `res.json()`), so there's nothing else to deploy or keep alive.
- Scraping and content extraction from arbitrary pages (Readability, Cheerio).
- Vector embedding + semantic search (Cohere → Pinecone).
- Session and auth handling (JWT + secure, cross-site-safe cookies).
- Cron job for periodic tag cleanup.
- Deployed on Render (Docker runtime) via a version-controlled Blueprint.

---

## 📁 Project structure (high-level)
```bash
.
├─ dist/                      # Compiled JS (production)
├─ prisma/                    # Prisma schema & migrations
├─ src/
│  ├─ controllers/            # Request handlers
│  ├─ routes/                 # Express routes
│  ├─ middlewares/            # Auth, validation, error handling
│  ├─ utils/                  # Helpers: cookies, JWTs, error handling
│  ├─ jobs/                   # Cron jobs, scheduled tasks
│  ├─ worker/                 # Scraping + embedding logic (imported directly, not a separate process)
│  ├─ prismaClient.ts         # Prisma client initialization
│  └─ server.ts               # Express app entrypoint
├─ Dockerfile
├─ docker-compose.yml         # Local dev only
├─ render.yaml                # Render Blueprint (source of truth for deployment)
├─ .dockerignore
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## 🛠 Tech stack (concise)
- Runtime: Node.js + TypeScript
- Web framework: Express
- ORM: Prisma (Supabase / PostgreSQL)
- Password hashing: bcryptjs (pure JS — no native build step)
- Embeddings: Cohere LLM
- Vector DB: Pinecone
- Scraping / parsing: Cheerio, jsdom, @mozilla/readability
- Deployment: Docker, Render (Blueprint-based)

---

## 🏗 Architecture

A single web service handles everything:

1. Client hits an API route (e.g. `POST /user/addcontent`).
2. The request is validated, written to Postgres, and the response is sent back immediately.
3. *After* the response is sent, the same process scrapes the URL, generates an embedding via Cohere, and upserts it into Pinecone — fire-and-forget, no queue, no separate worker.
4. A cron job (`node-cron`) runs nightly in the same process to clean up unused tags.

This intentionally trades a small amount of durability (an in-flight background job is lost if the process restarts mid-job) for a much simpler, cheaper deployment — appropriate for this app's traffic profile. See `src/worker/worker.ts` and `src/controllers/userController.ts` (`addContent`) for the actual wiring.

---
## ⚙️ Environment variables

Create a `.env` file in the project root (example keys below). **Do not** commit secrets.
```env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require&sslaccept=accept_invalid_certs"
JWT_SECRET=your_jwt_secret
BASE_LINK=http://localhost:2233
YOUTUBE_API_KEY=your_youtube_key
CHAT_API_KEY=your_cohere_chat_key
EMBED_API_KEY=your_cohere_embed_key
PINECONE_VDB_API_KEY=your_pinecone_key
# Optional: comma-separated extra origins allowed to hit this API with credentials
ALLOWED_ORIGINS=https://your-frontend-domain.com
```
`PORT` is injected automatically by Render/Docker at runtime — don't set it manually in `.env`.

The `?sslmode=require&sslaccept=accept_invalid_certs` suffix on `DATABASE_URL` is required for Prisma to connect to Supabase's pooler — Supabase's certificate chain uses a custom root CA that Prisma won't trust by default without it. Without this suffix every database call fails.

---

## 🚀 Local development (recommended)

1. Install dependencies
```
npm install
```
2. Setup Prisma (generate client)
```
npx prisma generate
# For development migrations:
npx prisma migrate dev --name init
# OR if you prefer pushing schema (non-destructive):
npx prisma db push
```

3. Start the server locally
```
npm run dev
# Runs: nodemon --watch src --exec ts-node ./src/server.ts
```

## 🐳 Using Docker (recommended for production parity)

```bash
docker compose up --build
```
This builds and starts the single `backend` service defined in `docker-compose.yml` — no other containers are required locally.

## 🚢 Deployment

This service deploys to **Render** via the Blueprint defined in `render.yaml`. Render watches the connected GitHub repo and redeploys automatically on every push to `main` — there's no separate CI/CD pipeline or SSH step to maintain.

To (re)provision from scratch: in the Render dashboard, choose **New → Blueprint**, point it at this repo/branch, and Render will read `render.yaml` and create the web service. Secrets marked `sync: false` in `render.yaml` (DB URL, JWT secret, API keys) must be filled in by hand in the Render dashboard — they are never read from this repo.

---

## 👨‍💻 Author

**Aditya Dubey**
📧 [adityadubey0034@gmail.com](mailto:adityadubey0034@gmail.com)
🌐 [secondbrain.notaditya.dev](https://secondbrain.notaditya.dev)
🐙 [GitHub](https://github.com/git-push-aditya)

> *"Code with purpose, build with clarity, and ship with impact."*
