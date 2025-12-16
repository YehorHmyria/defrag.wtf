# Defrag.WTF Backend

A brutalist tech news aggregator that uses AI to strip marketing BS and leave only raw facts.

## Overview

This Node.js backend runs 24/7, scraping tech news from major sources and using Google Gemini AI to "defragment" articles—removing fluff and extracting hard technical facts for a global English-speaking audience.

## Features

- 🤖 **AI-Powered Defragmentation**: Uses Google Gemini 1.5 Flash with a cynical analyst persona
- 📰 **Multi-Source Aggregation**: TechCrunch, The Verge, Wired, Hacker News
- ⏰ **Automated Scheduling**: Runs daily at 08:00 UTC via cron
- 🗄️ **Supabase Storage**: Stores defragmented articles with deduplication
- 🔧 **Manual Trigger**: On-demand processing via API endpoint
- 🛡️ **Rate Limiting**: 5-second delays between AI requests

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `GEMINI_API_KEY`: Your Google Gemini API key
- `DEFRAG_SECRET`: Secret key for manual triggers
- `PORT`: Server port (default: 3000)

### 3. Setup Database

Execute `schema.sql` in your Supabase SQL editor to create the `defrag_articles` table.

### 4. Start Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### Health Check

```
GET /health
```

Returns server status.

### Manual Trigger

```
GET /api/defrag-now?secret=YOUR_SECRET
```

Triggers the defragmentation process immediately (runs in background).

## Architecture

### Data Flow

1. **RSS Fetching**: Pulls feeds from configured sources
2. **Content Scraping**: Extracts full article text using cheerio
3. **AI Processing**: Sends to Gemini with defragmentation prompt
4. **Storage**: Inserts validated results into Supabase

### Database Schema

Table: `defrag_articles`

- `id` - UUID primary key
- `title` - Cynical headline (max 60 chars)
- `summary` - 3 bullet points of raw facts
- `short_tag` - 1-word uppercase tag (HYPE, CRASH, AI, etc.)
- `impact_score` - Technical significance (1-100)
- `original_url` - Source URL (unique)
- `source_name` - RSS feed source
- `published_at` - Original publication date
- `created_at` - Processing timestamp

### AI Prompt Strategy

The Gemini prompt enforces:

- **Strict English output**
- **Cynical, anti-hype tone**
- **JSON-only responses**
- **Factual technical analysis**
- **Brutal honesty about vaporware**

## Error Handling

- ✅ Try/catch blocks around all async operations
- ✅ Graceful skipping of failed articles
- ✅ Duplicate detection (unique constraint on URL)
- ✅ JSON validation for AI responses
- ✅ Detailed console logging

## Rate Limiting

5-second delay between AI requests prevents hitting Gemini API limits. For high-volume runs, expect processing time of ~4-5 minutes for 50 articles.

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Server**: Express.js
- **Database**: Supabase
- **AI**: Google Gemini 1.5 Flash
- **Scheduling**: node-cron
- **Scraping**: rss-parser, axios, cheerio

## License

MIT
