# SecondBrain — Backend

[Live site: secondbrain.notaditya.dev](https://secondbrain.notaditya.dev)

A production-focused backend for **SecondBrain** — an AI-powered content management system that saves, semantically organizes, and enables conversational retrieval of links, posts, and articles.
This repo provides the API server, scraping, embedding, and vector-search integration required for the full product.

---

![Node.js](https://img.shields.io/badge/Node-%3E=18-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-%3E=5-blue) ![Docker](https://img.shields.io/badge/Docker-enabled-blue) ![Prisma](https://img.shields.io/badge/Prisma-ready-purple)

## What this service does

- Exposes REST APIs for ingestion, retrieval, auth, collections, and communities.
- Scrapes and extracts content from web pages, YouTube, Reddit, and Twitter/X.
- Runs scraping and embedding as background work in the same process, right after the API response is sent — no separate queue or worker service.
- Generates vector embeddings (Cohere) and stores them in Pinecone for semantic search.
- Answers questions over a user's saved content with a retrieval-augmented chatbot (Pinecone lookup, Cohere chat).
- Persists metadata and app state with Prisma (Supabase / PostgreSQL).
- Generates shareable collections — deep-copy links of user-curated content for easy sharing.
- Supports community collaboration — multiple members share, upvote, and downvote links within a community.
- Dockerized, deployed on Render via a Blueprint (`render.yaml`).

---

## Key features

- Single always-on web process: request handling and background scrape/embed work share one Node process (fire-and-forget after `res.json()`), so there is nothing else to deploy or keep alive.
- Scraping and content extraction from arbitrary pages (Readability, Cheerio, jsdom) plus per-platform scrapers.
- Vector embedding and semantic search (Cohere to Pinecone).
- Session and auth handling (JWT with secure, cross-site-safe cookies) and password hashing via `@node-rs/bcrypt`.
- Zod-validated request bodies and query params on every route.
- `helmet` security headers, credential-aware CORS allowlist, and gzip `compression` on responses.
- `GET /health` — an auth-free, DB-free endpoint the frontend pings on load to wake a sleeping Render instance.
- Nightly cron job (`node-cron`, 02:00) that deletes tags no longer attached to any content.
- Deployed on Render (Docker runtime) via a version-controlled Blueprint.

---

## Project structure

```bash
.
├─ dist/                      # Compiled JS (production)
├─ prisma/                    # Prisma schema & migrations
├─ src/
│  ├─ controllers/            # Request handlers (auth, user, community, chatbot, me)
│  ├─ routes/                 # Express routes
│  ├─ middlewares/            # JWT auth, Zod validation, ownership checks
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

## Tech stack

- Runtime: Node.js + TypeScript
- Web framework: Express
- ORM: Prisma (Supabase / PostgreSQL), with the `relationJoins` preview feature enabled
- Validation: Zod
- Password hashing: `@node-rs/bcrypt`
- Embeddings and chat: Cohere
- Vector DB: Pinecone
- Scraping / parsing: Cheerio, jsdom, `@mozilla/readability`, YouTube Data API
- Deployment: Docker, Render (Blueprint-based)

---

## API surface

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness ping, no auth or DB access |
| `POST` | `/auth/signup`, `/auth/signin`, `/auth/logout` | Account creation, login, cookie clearing |
| `GET` | `/me` | Restore session from the JWT cookie |
| `POST` | `/user/addcontent`, `/user/deletecontent` | Save or remove a link (scrape + embed happen after the response) |
| `GET` | `/user/fetchcontents`, `/user/fetchtaggedcontent` | Paged content listing, tag-filtered listing |
| `POST` | `/user/createcollection`, `/user/deletecollection` | Collection management |
| `PATCH` | `/user/generatelink` | Create a shareable deep-copy link |
| `POST` | `/user/removeshare` | Revoke a shareable link |
| `GET` | `/user/sharedbrain`, `/user/paginatedshareddata` | Public read of a shared collection |
| `POST` | `/user/createcommunity`, `/user/joinCommunity`, `/user/sharelogin` | Community lifecycle |
| `GET` | `/user/getcommunitycontent` | Community feed |
| `POST` | `/user/addcommunitycontent`, `/user/vote`, `/user/getmembers` | Community posting, voting, roster |
| `POST` | `/user/chatbot` | Retrieval-augmented Q&A over the user's saved content |

---

## Architecture

A single web service handles everything:

1. Client hits an API route (for example `POST /user/addcontent`).
2. The request is Zod-validated, authenticated via the JWT cookie, written to Postgres, and the response is sent back immediately.
3. *After* the response is sent, the same process scrapes the URL, generates an embedding via Cohere, and upserts it into Pinecone — fire-and-forget, no queue, no separate worker.
4. `POST /user/chatbot` embeds the question, queries Pinecone for the user's nearest content vectors, hydrates those rows from Postgres, and answers with Cohere chat over that context.
5. A cron job (`node-cron`) runs nightly in the same process to clean up unused tags.

This intentionally trades a small amount of durability (an in-flight background job is lost if the process restarts mid-job) for a much simpler, cheaper deployment — appropriate for this app's traffic profile. See `src/worker/worker.ts` and `src/controllers/userController.ts` (`addContent`) for the actual wiring.

The content-to-collection relation is denormalized (`content.collectionId` alongside the join table), which removes a round trip from the hot fetch path; `relationJoins` collapses nested tag loads into a single LATERAL join instead of a follow-up query.

---

## Environment variables

Create a `.env` file in the project root (example keys below). **Do not** commit secrets.

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:6543/dbname?sslmode=require&sslaccept=accept_invalid_certs&pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/dbname?sslmode=require&sslaccept=accept_invalid_certs"
JWT_SECRET=your_jwt_secret
BASE_LINK=http://localhost:2233
YOUTUBE_API_KEY=your_youtube_key
CHAT_API_KEY=your_cohere_chat_key
EMBED_API_KEY=your_cohere_embed_key
PINECONE_VDB_API_KEY=your_pinecone_key
# Optional: comma-separated extra origins allowed to hit this API with credentials
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

`PORT` is injected automatically by Render/Docker at runtime — do not set it manually in `.env`.

`http://localhost:5173` and `https://secondbrain.notaditya.dev` are always allowed by CORS; `ALLOWED_ORIGINS` only adds to that list.

Use Supabase's **Transaction pooler** connection string (port `6543`) for `DATABASE_URL`, not the Session pooler (`5432`). The `sslmode=require&sslaccept=accept_invalid_certs` suffix is required for Prisma to trust Supabase's certificate chain (a custom root CA), and `pgbouncer=true` is required for Prisma to work correctly against PgBouncer's transaction-mode pooling. Without these, database calls fail or become unreliable. `DIRECT_URL` points at the direct (non-pooled) connection and is used by Prisma Migrate only.

---

## Local development

1. Install dependencies

```bash
npm install
```

2. Set up Prisma (generate client)

```bash
npx prisma generate
# For development migrations:
npx prisma migrate dev --name init
# OR if you prefer pushing schema (non-destructive):
npx prisma db push
```

3. Start the server locally

```bash
npm run dev
# Runs: nodemon --watch src --exec ts-node ./src/server.ts
```

The server listens on `http://localhost:2233` by default.

## Using Docker (production parity)

```bash
docker compose up --build
```

This builds and starts the single `backend` service defined in `docker-compose.yml` — no other containers are required locally.

## Deployment

This service deploys to **Render** via the Blueprint defined in `render.yaml`. Render watches the connected GitHub repo and redeploys automatically on every push to `main` — there is no separate CI/CD pipeline or SSH step to maintain.

To (re)provision from scratch: in the Render dashboard, choose **New → Blueprint**, point it at this repo/branch, and Render will read `render.yaml` and create the web service. Secrets marked `sync: false` in `render.yaml` (DB URLs, JWT secret, API keys) must be filled in by hand in the Render dashboard — they are never read from this repo.

---

## Author

**Aditya Dubey**

- Email: [adityadubey0034@gmail.com](mailto:adityadubey0034@gmail.com)
- Site: [secondbrain.notaditya.dev](https://secondbrain.notaditya.dev)
- GitHub: [git-push-aditya](https://github.com/git-push-aditya)

> *"Code with purpose, build with clarity, and ship with impact."*
