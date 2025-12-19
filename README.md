# Defrag.WTF

https://defrag.wtf/

**Defrag.WTF** is a brutalist tech‑news aggregator that defragments articles into raw, signal‑only facts. The project combines automated scraping, AI‑assisted summarization, and a minimalist React frontend.

The repository is a **full‑stack monorepo**:

* **Backend**: Node.js + Express, scheduled ingestion, AI processing, Supabase persistence
* **Frontend**: React (Vite) + Tailwind, PWA‑ready UI

---

## High‑Level Architecture

1. RSS feeds and article pages are fetched from multiple tech news sources.
2. Content is cleaned (HTML → text) and deduplicated.
3. An LLM processes each article to remove marketing language and extract factual substance.
4. Results are stored in Supabase.
5. The React client consumes the API and renders a fast, minimal interface.

---

## Features

### Backend

* Automated RSS aggregation (TechCrunch, The Verge, Wired, Hacker News, etc.)
* HTML scraping and content normalization (Cheerio)
* AI‑powered "defragmentation" of articles
* Scheduled daily ingestion via `node-cron`
* Manual ingestion trigger via protected API endpoint
* Supabase persistence with basic deduplication
* Rate‑limited AI calls to avoid provider throttling

### Frontend

* React 19 + Vite
* Tailwind CSS for a minimalist, brutalist aesthetic
* Search and filtering UI
* Impact / signal density indicators
* Installable PWA (via `vite-plugin-pwa`)
* Dark / light theme toggle

---

## Tech Stack

### Backend

* Node.js (ES Modules)
* Express
* Supabase (`@supabase/supabase-js`)
* AI providers:

  * Groq SDK
  * Google Generative AI
* RSS & scraping: `rss-parser`, `axios`, `cheerio`
* Scheduling: `node-cron`

### Frontend

* React 19
* Vite
* Tailwind CSS
* Lucide Icons

---

## Repository Structure

```
.
├── client/                 # Frontend (React + Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── server.js               # Express backend entry point
├── schema.sql              # Supabase database schema
├── package.json            # Backend dependencies & scripts
├── railway.json            # Railway deployment config
└── README.md
```

---

## Environment Variables

The backend requires the following environment variables:

```env
PORT=3000
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
DEFRAG_SECRET=secret_for_manual_triggers
```

---

## Database Setup

1. Create a Supabase project.
2. Execute `schema.sql` in the Supabase SQL editor.
3. Ensure row‑level security and API access are configured appropriately.

---

## Local Development

### Backend

```bash
npm install
npm run dev
```

The server starts on `http://localhost:3000` by default.

### Frontend

```bash
cd client
npm install
npm run dev
```

The frontend runs on Vite’s default dev server and consumes the backend API.

---

## Build & Deployment

### Production Build

```bash
npm run build
```

This installs dependencies and builds the client into static assets.

### Deployment

* Backend is compatible with Railway, Fly.io, Render, or similar Node.js platforms.
* A `railway.json` file is included for Railway deployments.
* Supabase is used as the hosted database.

---

## API Overview

* `POST /api/defrag/run`

  * Manually trigger article ingestion
  * Requires `DEFRAG_SECRET`

* `GET /api/articles`

  * Fetch processed articles for the frontend

(Exact routes and payloads are defined in `server.js`.)

---

## Design Philosophy

Defrag.WTF intentionally avoids:

* SEO‑optimized fluff
* Marketing language
* Opinion masquerading as facts

The goal is to surface **what actually happened**, as efficiently as possible.

---

## License

MIT
