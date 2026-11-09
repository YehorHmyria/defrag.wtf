# Defrag.WTF

https://defrag.wtf/

**Defrag.WTF** is a brutalist tech‑news aggregator that defragments articles into raw, signal‑only facts. The project combines automated scraping, AI‑assisted summarization, and a minimalist React frontend.

The repository is a **full‑stack monorepo**:

* **Backend**: Node.js + Express, scheduled ingestion, AI processing, Supabase persistence
* **Frontend**: React (Vite) + Tailwind, PWA‑ready UI

---

## High‑Level Architecture

```
 12 sources ──► fetch ──► dedupe (URL) ──► scrape ──► LLM feature extraction
 (RSS, HN API,                                         (type, entities, stack tags, UA summary)
  CISA KEV)                                                      │
                                                                 ▼
 React UI ◄── REST API ◄── Supabase ◄── event clustering ◄── deterministic impact score
 (feed, radar,            (Postgres +    (TF‑IDF cosine +      (explainable breakdown)
  graph, trends, ask)      full‑text)     CVE hard match)
```

**Key design decision:** the LLM only *extracts* features (event type, confirmed?, technical detail, audience, entities).
The impact score is computed in code (`server/scoring.js`), so it is reproducible, unit‑tested and explainable
("why this score?" in the UI). Credibility of an event is derived from source trust, independent corroboration and
presence of a primary source (vendor blog / advisory / CVE).

---

## Features

* **Event clustering** – articles about the same real‑world event are merged into one card with a coverage timeline
* **Explainable impact score** and **credibility score** per event
* **Entity knowledge graph** – interactive force‑directed graph of companies, technologies, products and people
* **Stack Radar** – set your stack (or import `package.json`); get only the CVEs, deprecations and outages that touch it
* **Trends** – which entities and kinds of news are heating up over time
* **Ask Defrag** – RAG question answering over the article base, with citations
* **12 sources**: TechCrunch, The Verge, Wired, Ars Technica, The Register, InfoQ, BleepingComputer, GitHub Blog,
  Cloudflare Blog, Lobsters, Hacker News (API), CISA Known Exploited Vulnerabilities (structured, no LLM)
* Server‑side full‑text search (Postgres `tsvector`), Ctrl/⌘+K
* English / Ukrainian summaries
* Parallel ingestion with rate limiting and retry, scheduled every 3 hours
* Installable PWA, 4 themes, keyboard accessible

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

See [`.env.example`](.env.example). Required: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (or `SUPABASE_ANON_KEY`),
`GROQ_API_KEY`, `DEFRAG_SECRET`.

---

## Database Setup

1. Create a Supabase project (free projects pause after a week of inactivity: restore it in the dashboard if it is paused).
2. Execute `schema.sql` in the Supabase SQL editor.
3. Execute `supabase/migrations/002_context_hub.sql` (idempotent: adds entities, event clusters, full‑text search).
4. Set `SUPABASE_SERVICE_KEY` on the server, then optionally enable RLS (see the commented block in the migration).

---

## Demo data (optional)

To see the UI filled before the first real ingestion, load the fictional demo set (19 events, 45 articles over ~12 days,
marked `DEMO` in the UI and `meta.mock = true` in the database):

* **No keys needed:** paste [`supabase/seed.sql`](supabase/seed.sql) into the Supabase SQL Editor (run it after migration 002).
* **Or from the CLI:** `npm run seed` (uses `.env`).
* **Remove it later:** `npm run seed -- --clean` or `DELETE FROM defrag_articles WHERE meta->>'mock' = 'true';`
* **Real articles instead of fictional ones:** [`supabase/seed_real.sql`](supabase/seed_real.sql) holds 21 genuine articles fetched from the live sources (snapshot of 9 Nov 2026), with the LLM extraction step done by hand and the score/clustering computed by the real code. CLI: `npm run seed -- --real`; remove with `npm run seed -- --clean --real` or `DELETE FROM defrag_articles WHERE meta->>'sample' = 'real';`. Refresh the snapshot with `node scripts/fetch-real.js out.json` and edit `scripts/real-data.js`.

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

| Endpoint | Description |
|---|---|
| `GET /api/events` | Clustered events. Params: `days`, `type` (signal/trash/all), `sort` (impact/recent/relevance/coverage), `stack`, `tag`, `event_type`, `page` |
| `GET /api/articles` | Flat article list, `q` = full‑text search |
| `GET /api/graph` | Entity co‑occurrence graph (`days`, `min`, `nodes`) |
| `GET /api/trends` | Per‑day event counts per entity |
| `GET /api/alerts?stack=` | Security / deprecation / outage events touching a stack |
| `POST /api/ask` | RAG answer with citations (rate limited) |
| `GET /api/stats`, `/api/sources`, `/health` | Metadata |
| `POST /api/defrag/run` | Trigger ingestion (header `x-defrag-secret`) |

## Tests

```bash
npm test   # scoring, credibility, clustering, LLM‑output normalisation
```

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
