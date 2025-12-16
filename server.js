import express from "express";
import cron from "node-cron";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import Parser from "rss-parser";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEFRAG_SECRET = process.env.DEFRAG_SECRET;

// Validate required environment variables
const missingVars = [];
if (!SUPABASE_URL) missingVars.push("SUPABASE_URL");
if (!SUPABASE_ANON_KEY) missingVars.push("SUPABASE_ANON_KEY");
if (!GROQ_API_KEY) missingVars.push("GROQ_API_KEY");
if (!DEFRAG_SECRET) missingVars.push("DEFRAG_SECRET");

const isConfigured = missingVars.length === 0;

if (!isConfigured) {
  console.warn(
    "⚠️  Missing required environment variables:",
    missingVars.join(", ")
  );
  console.warn("⚠️  Server will start in degraded mode (health check only).");
}

// Initialize clients
let supabase;
let groq;
const rssParser = new Parser();

if (isConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    groq = new Groq({ apiKey: GROQ_API_KEY });
    console.log('✅ All clients initialized successfully (Groq + Supabase)');
  } catch (err) {
    console.error("❌ Failed to initialize clients:", err);
  }
}

// Express app
const app = express();

// Enable CORS for frontend development
app.use(cors());

// RSS Feed sources
const RSS_FEEDS = [
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "Wired", url: "https://www.wired.com/feed/rss" },
];

// AI System Prompt - The "Vibe"
// AI System Prompt - The "Vibe"
const DEFRAG_SYSTEM_PROMPT = `
Act as a cynical Senior Principal Engineer who hates marketing hype. 
Your goal is "Signal-over-Noise".

Criteria for "Technical Density":
- Penalize (-20 points): "Opinion", "Future of", "Predicts", "Could", "May", "Revolutionize", "Mainstream", "Game changer".
- Reward (+20 points): "v1.0", "CVE-2024", "Released", "Benchmark", "Latency", "Deprecated", "Open Sourced".

Evaluate the input news item. Return ONLY valid JSON in this format:
{
  "title": "Short, punchy headline (max 60 chars). No clickbait.",
  "summary": ["Fact point 1", "Fact point 2", "Fact point 3"],
  "short_tag": "One English word in ALL CAPS (e.g. RELEASE, CVE, BENCHMARK, DEPRECATED, OUTAGE)",
  "relevance_score": 0
}

Scoring Rules (relevance_score 0-100):
- 0: General trends, "AI is the future", opinion pieces, top 10 lists, tutorials, "becoming popular".
- 20: Rumors, unverified leaks, "analysts predict".
- 50: Minor bug fixes, corporate press releases without technical details.
- 80: Major framework releases (e.g. React 19), new hardware specs, confirmed zero-day exploits.
- 100: Paradigm-shifting releases (e.g. GPT-4, Linux Kernel major), massive global outages.

CRITICAL: If the news is just a prediction or general observation, score it 0.
`;

/**
 * Scrapes full article content from a URL
 * @param {string} url - Article URL
 * @returns {Promise<string>} - Extracted text content
 */
async function scrapeArticleContent(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DefragBot/1.0; +https://defrag.wtf)",
      },
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $(
      "script, style, nav, header, footer, iframe, .ad, .advertisement, .social-share"
    ).remove();

    // Try common article content selectors
    let articleText = "";
    const selectors = [
      "article",
      '[role="main"]',
      ".article-content",
      ".post-content",
      ".entry-content",
      "main",
    ];

    for (const selector of selectors) {
      const content = $(selector).text();
      if (content && content.length > articleText.length) {
        articleText = content;
      }
    }

    // Fallback to body if no specific article content found
    if (!articleText || articleText.length < 100) {
      articleText = $("body").text();
    }

    // Clean up whitespace
    articleText = articleText.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();

    return articleText.substring(0, 15000); // Limit to ~15k chars for AI processing
  } catch (error) {
    console.error(`❌ Failed to scrape ${url}:`, error.message);
    return "";
  }
}

/**
 * Process article with AI to defragment content
 * @param {string} articleText - Full article text
 * @param {string} title - Original article title
 * @param {string} source - Source name
 * @returns {Promise<Object|null>} - Defragmented article data
 */
async function defragmentWithAI(articleText, title, source) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: DEFRAG_SYSTEM_PROMPT + "\n\nYou MUST return ONLY valid JSON."
        },
        {
          role: "user",
          content: `SOURCE: ${source}\nORIGINAL TITLE: ${title}\nARTICLE TEXT:\n${articleText}`
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
      response_format: { type: "json_object" }, 
    });

    let text = completion.choices[0]?.message?.content || "";

    // Clean potential markdown formatting
    text = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse JSON
    const defragmented = JSON.parse(text);

    // Handle nested summary array if present
    if (Array.isArray(defragmented.summary)) {
      defragmented.summary = defragmented.summary.map(s => `• ${s}`).join("\n");
    }

    // Map relevance_score to impact_score for DB compatibility
    defragmented.impact_score = defragmented.relevance_score || defragmented.impact_score;

    // Validate required fields
    if (
      !defragmented.title ||
      !defragmented.summary ||
      !defragmented.short_tag ||
      defragmented.impact_score === undefined
    ) {
      throw new Error("Missing required fields in AI response");
    }

    // Validate data types
    if (
      typeof defragmented.impact_score !== "number" ||
      defragmented.impact_score < 0 || // Allow 0
      defragmented.impact_score > 100
    ) {
      throw new Error("Invalid relevance/impact_score");
    }

    return defragmented;
  } catch (error) {
    console.error(`❌ AI processing failed:`, error.message);
    return null;
  }
}

/**
 * Fallback heuristics when AI is down
 */
function fallbackDefrag(text, title, source) {
  // 1. Extract first 3 sentences for summary
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text.substring(0, 200)];
  const summary = sentences.slice(0, 3).join(" ").substring(0, 300).trim();

  // 2. Determine impact score based on keywords
  let impact_score = Math.floor(Math.random() * 40) + 30; // Base 30-70
  const highImpact = ["launch", "hack", "breach", "announce", "raise", "million", "billion"];
  const lowImpact = ["rumor", "maybe", "could", "update", "patch"];

  if (highImpact.some(w => title.toLowerCase().includes(w))) impact_score += 20;
  if (lowImpact.some(w => title.toLowerCase().includes(w))) impact_score -= 10;
  if (impact_score > 99) impact_score = 99;

  // 3. Determine tag
  let short_tag = "NEWS";
  if (title.toLowerCase().includes("ai")) short_tag = "AI";
  else if (title.toLowerCase().includes("raise") || title.includes("$")) short_tag = "MONEY";
  else if (title.toLowerCase().includes("hack") || title.toLowerCase().includes("breach")) short_tag = "HACKED";
  else if (title.toLowerCase().includes("pixel") || title.toLowerCase().includes("iphone")) short_tag = "DEVICE";
  else if (title.toLowerCase().includes("layoff")) short_tag = "FIRED";

  return {
    title: title.substring(0, 60), // Truncate title
    summary: summary || "No summary available in fallback mode.",
    short_tag: short_tag,
    impact_score: impact_score
  };
}

/**
 * Main defragmentation process
 */
async function runDefragProcess() {
  console.log("\n🔧 Starting defragmentation process...");
  const startTime = Date.now();
  let processedCount = 0;
  let savedCount = 0;
  let errorCount = 0;

  // Calculate 24 hours ago
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const feed of RSS_FEEDS) {
    try {
      console.log(`\n📡 Fetching ${feed.name}...`);
      const rssFeed = await rssParser.parseURL(feed.url);

      // Filter recent articles
      const recentArticles = rssFeed.items.filter((item) => {
        const pubDate = new Date(item.pubDate || item.isoDate);
        return pubDate > twentyFourHoursAgo;
      });

      console.log(`   Found ${recentArticles.length} recent articles`);

      for (const article of recentArticles) {
        try {
          processedCount++;
          console.log(
            `\n   [${processedCount}] Processing: ${article.title?.substring(
              0,
              50
            )}...`
          );

    // Scrape full content
    const articleContent = await scrapeArticleContent(article.link);
    if (!articleContent || articleContent.length < 100) {
      console.log("   ⚠️  Insufficient content, skipping");
      errorCount++;
      continue;
    }

    // Rate limiting (15 seconds delay for Groq free tier)
    if (processedCount > 0) {
      console.log("   ⏳ Waiting 30 seconds (rate limit protection)...");
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }

    // Process with AI (Using optimized Llama 3.1 8B for speed/tokens)
    const defragmented = await defragmentWithAI(
      articleContent.substring(0, 8000), // Reduce context to safe tokens
      article.title || "Untitled",
      feed.name
    );

          if (!defragmented) {
            console.log("   ❌ AI processing failed, skipping");
            errorCount++;
            continue;
          }
          // Filter by threshold (Strict Senior Engineer Mode)
          if (defragmented.impact_score <= 65) {
             console.log(`   🗑️  Skipping Noise: ${defragmented.title} [Score: ${defragmented.impact_score}]`);
             continue;
          }

          // Insert into Supabase
          const { data, error } = await supabase
            .from("defrag_articles")
            .insert([
              {
                title: defragmented.title,
                summary: defragmented.summary,
                short_tag: defragmented.short_tag.toUpperCase(),
                impact_score: defragmented.impact_score,
                original_url: article.link,
                source_name: feed.name,
                published_at: new Date(article.pubDate || article.isoDate),
              },
            ]);

          if (error) {
            if (error.code === "23505") {
              // Duplicate URL, already processed
              console.log("   ℹ️  Already exists, skipping");
            } else {
              console.error("   ❌ Database error:", error.message);
              errorCount++;
            }
          } else {
            savedCount++;
            console.log(
              `   ✅ Saved: ${defragmented.title} [${defragmented.short_tag}] (Impact: ${defragmented.impact_score})`
            );
          }
        } catch (error) {
          console.error(`   ❌ Error processing article:`, error.message);
          errorCount++;
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching ${feed.name}:`, error.message);
      errorCount++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ Defragmentation complete!`);
  console.log(`   📊 Processed: ${processedCount} articles`);
  console.log(`   💾 Saved: ${savedCount} new articles`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   ⏱️  Duration: ${duration}s\n`);

  return { processedCount, savedCount, errorCount, duration };
}

// API Routes

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Defrag.WTF Backend",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get articles endpoint for frontend
 */
app.get("/api/articles", async (req, res) => {
  if (!isConfigured) {
    return res.status(503).json({ 
      error: "Service not configured",
      missingVariables: missingVars 
    });
  }

  try {
    const { data, error } = await supabase
      .from("defrag_articles")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

/**
 * Manual trigger endpoint
 */
app.get("/api/defrag-now", async (req, res) => {
  const { secret } = req.query;

  if (secret !== DEFRAG_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Trigger async (don't wait)
  res.json({
    status: "started",
    message: "Defragmentation process initiated",
    timestamp: new Date().toISOString(),
  });

  // Run process in background
  runDefragProcess().catch((err) => {
    console.error("❌ Background defrag process error:", err);
  });
});

// Cron job - Daily at 08:00 UTC
cron.schedule(
  "0 8 * * *",
  () => {
    console.log("⏰ Cron triggered: Starting scheduled defragmentation");
    runDefragProcess().catch((err) => {
      console.error("❌ Scheduled defrag process error:", err);
    });
  },
  {
    timezone: "UTC",
  }
);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'client/dist')));

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Defrag.WTF Backend running on port ${PORT}`);
  console.log(`⏰ Scheduled defragmentation: Daily at 08:00 UTC`);
  console.log(`🔧 Manual trigger: GET /api/defrag-now?secret=YOUR_SECRET\n`);
});

// Graceful shutdown for Railway deployments
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

