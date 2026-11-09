import express from "express";
import crypto from "crypto";
import { config } from "./config.js";
import { supabase } from "./db.js";
import { SOURCES, trustByName, kindByName } from "./sources.js";
import { computeCredibility } from "./scoring.js";
import { answerFromContext } from "./ai.js";
import { runDefragProcess, runState } from "./pipeline.js";

export const router = express.Router();

const COLS =
  "id,title,summary,short_tag,impact_score,original_url,source_name,source_kind,published_at,created_at," +
  "title_uk,summary_uk,event_type,entities,stack_tags,cve_ids,score_breakdown,meta,event_id";

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();
const clampInt = (v, def, lo, hi) => Math.max(lo, Math.min(hi, parseInt(v) || def));

// ---- tiny TTL cache (protects Supabase from refresh storms) ----------------
const cache = new Map();
const cached = (key, ttlMs, fn) => async () => {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;
  const value = await fn();
  cache.set(key, { value, exp: Date.now() + ttlMs });
  return value;
};

// ---- helpers ---------------------------------------------------------------
const parseStack = (s) =>
  String(s || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 60);

/** Which items of the user's stack does this article touch? */
export function matchStack(article, stack) {
  if (!stack.length) return [];
  const names = new Set([
    ...(article.stack_tags || []),
    ...(article.entities || []).map((e) => String(e.name).toLowerCase()),
  ]);
  const title = ` ${String(article.title).toLowerCase()} `;
  return stack.filter((s) => names.has(s) || title.includes(` ${s} `));
}

function guard(handler) {
  return async (req, res) => {
    if (!config.isConfigured) return res.status(503).json({ error: "Service not configured", missingVariables: config.missing });
    try {
      await handler(req, res);
    } catch (err) {
      console.error(`❌ ${req.path}:`, err.message);
      res.status(500).json({ error: "Internal error" });
    }
  };
}

async function fetchWindow(hours, limit = 800) {
  const { data, error } = await supabase
    .from("defrag_articles")
    .select(COLS)
    .gte("published_at", hoursAgo(hours))
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

function groupEvents(articles, stack = []) {
  const groups = new Map();
  for (const a of articles) {
    const key = a.event_id || a.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }
  return [...groups.entries()].map(([id, list]) => {
    const top = [...list].sort((a, b) => b.impact_score - a.impact_score)[0];
    const timeline = [...list].sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
    const entityCount = new Map();
    list.forEach((a) => (a.entities || []).forEach((e) => entityCount.set(e.name, (entityCount.get(e.name) || 0) + 1)));
    const matched = [...new Set(list.flatMap((a) => matchStack(a, stack)))];
    return {
      id,
      title: top.title,
      title_uk: top.title_uk,
      summary: top.summary,
      summary_uk: top.summary_uk,
      short_tag: top.short_tag,
      event_type: top.event_type,
      max_impact: top.impact_score,
      score_breakdown: top.score_breakdown,
      cve_ids: [...new Set(list.flatMap((a) => a.cve_ids || []))],
      stack_tags: [...new Set(list.flatMap((a) => a.stack_tags || []))],
      entities: [...entityCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name),
      first_seen: timeline[0].published_at,
      last_seen: timeline[timeline.length - 1].published_at,
      article_count: list.length,
      credibility: computeCredibility(list, trustByName, kindByName),
      matched,
      relevance: matched.length,
      articles: timeline.map((a) => ({
        id: a.id,
        title: a.title,
        source_name: a.source_name,
        source_kind: a.source_kind,
        url: a.original_url,
        published_at: a.published_at,
        meta: a.meta,
      })),
    };
  });
}

// ---- public endpoints ------------------------------------------------------

router.get("/health", (req, res) =>
  res.json({ status: "ok", service: "Defrag.WTF Backend", configured: config.isConfigured, timestamp: new Date().toISOString() })
);

/** Flat article list (kept backwards-compatible). q = full-text search. */
router.get("/api/articles", guard(async (req, res) => {
  const page = clampInt(req.query.page, 1, 1, 1000);
  const limit = clampInt(req.query.limit, 20, 1, 100);
  const days = clampInt(req.query.days, 2, 1, 90);
  const type = req.query.type || "signal";
  const from = (page - 1) * limit;

  let query = supabase
    .from("defrag_articles")
    .select(COLS)
    .gte("published_at", hoursAgo(days * 24))
    .order("published_at", { ascending: false })
    .range(from, from + limit - 1);

  if (type === "signal") query = query.gte("impact_score", 70);
  else if (type === "trash") query = query.lt("impact_score", 70);
  if (req.query.tag) query = query.eq("short_tag", String(req.query.tag).toUpperCase());
  if (req.query.source) query = query.eq("source_name", req.query.source);
  if (req.query.q) query = query.textSearch("fts", String(req.query.q).slice(0, 100), { type: "websearch", config: "english" });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}));

/** Clustered events: the core of the hub. */
router.get("/api/events", guard(async (req, res) => {
  const days = clampInt(req.query.days, 2, 1, 14);
  const limit = clampInt(req.query.limit, 20, 1, 60);
  const page = clampInt(req.query.page, 1, 1, 100);
  const stack = parseStack(req.query.stack);
  const sort = req.query.sort || (stack.length ? "relevance" : "impact");
  const type = req.query.type || "signal"; // signal | trash | all
  const tag = req.query.tag ? String(req.query.tag).toUpperCase() : null;
  const eventType = req.query.event_type ? String(req.query.event_type).toUpperCase() : null;

  const articles = await cached(`win:${days}`, 45_000, () => fetchWindow(days * 24))();
  let events = groupEvents(articles, stack);

  if (type === "signal") events = events.filter((e) => e.max_impact >= 70);
  else if (type === "trash") events = events.filter((e) => e.max_impact < 70);
  if (tag) events = events.filter((e) => e.short_tag === tag);
  if (eventType) events = events.filter((e) => e.event_type === eventType);

  const sorters = {
    impact: (a, b) => b.max_impact - a.max_impact || new Date(b.last_seen) - new Date(a.last_seen),
    recent: (a, b) => new Date(b.last_seen) - new Date(a.last_seen),
    relevance: (a, b) => b.relevance - a.relevance || b.max_impact - a.max_impact,
    coverage: (a, b) => b.article_count - a.article_count || b.max_impact - a.max_impact,
  };
  events.sort(sorters[sort] || sorters.impact);

  const total = events.length;
  res.json({ total, page, events: events.slice((page - 1) * limit, page * limit) });
}));

/** Entity co-occurrence graph (nodes/edges are counted per EVENT, not per article). */
router.get("/api/graph", guard(async (req, res) => {
  const days = clampInt(req.query.days, 7, 1, 30);
  const minCount = clampInt(req.query.min, 2, 1, 20);
  const maxNodes = clampInt(req.query.nodes, 60, 10, 150);

  const data = await cached(`graph:${days}:${minCount}:${maxNodes}`, 120_000, async () => {
    const articles = await fetchWindow(days * 24, 1500);
    const events = new Map();
    for (const a of articles) {
      const key = a.event_id || a.id;
      if (!events.has(key)) events.set(key, { entities: new Map(), impact: 0 });
      const ev = events.get(key);
      ev.impact = Math.max(ev.impact, a.impact_score);
      (a.entities || []).forEach((e) => ev.entities.set(String(e.name).toLowerCase(), e));
    }
    const nodes = new Map();
    const edges = new Map();
    for (const ev of events.values()) {
      const list = [...ev.entities.entries()];
      for (const [k, e] of list) {
        const n = nodes.get(k) || { id: k, name: e.name, type: e.type, count: 0, impact: 0 };
        n.count++;
        n.impact = Math.max(n.impact, ev.impact);
        nodes.set(k, n);
      }
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
          const [a, b] = [list[i][0], list[j][0]].sort();
          edges.set(`${a}|${b}`, (edges.get(`${a}|${b}`) || 0) + 1);
        }
    }
    const kept = [...nodes.values()].filter((n) => n.count >= minCount).sort((a, b) => b.count - a.count).slice(0, maxNodes);
    const ids = new Set(kept.map((n) => n.id));
    const links = [...edges.entries()]
      .map(([k, w]) => ({ source: k.split("|")[0], target: k.split("|")[1], weight: w }))
      .filter((l) => ids.has(l.source) && ids.has(l.target));
    return { nodes: kept, links, events: events.size };
  })();
  res.json(data);
}));

/** Per-day event counts for the hottest entities. */
router.get("/api/trends", guard(async (req, res) => {
  const days = clampInt(req.query.days, 14, 3, 60);
  const data = await cached(`trends:${days}`, 120_000, async () => {
    const articles = await fetchWindow(days * 24, 2000);
    const dayKeys = Array.from({ length: days }, (_, i) => new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10));
    const per = new Map(); // entity -> Map(day -> Set(eventId))
    const byType = {};
    const seenEvt = new Set();
    for (const a of articles) {
      const day = new Date(a.published_at).toISOString().slice(0, 10);
      const key = a.event_id || a.id;
      if (!seenEvt.has(key)) {
        seenEvt.add(key);
        byType[a.event_type || "OTHER"] = (byType[a.event_type || "OTHER"] || 0) + 1;
      }
      for (const e of a.entities || []) {
        const k = String(e.name).toLowerCase();
        if (!per.has(k)) per.set(k, { name: e.name, type: e.type, days: new Map() });
        const d = per.get(k).days;
        if (!d.has(day)) d.set(day, new Set());
        d.get(day).add(key);
      }
    }
    const series = [...per.values()]
      .map((s) => {
        const counts = dayKeys.map((d) => s.days.get(d)?.size || 0);
        return { name: s.name, type: s.type, counts, total: counts.reduce((a, b) => a + b, 0) };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
    return { days: dayKeys, series, by_type: byType };
  })();
  res.json(data);
}));

/** Stack radar: security / deprecation / outage events that touch the user's stack. */
router.get("/api/alerts", guard(async (req, res) => {
  const stack = parseStack(req.query.stack);
  if (!stack.length) return res.json({ stack, alerts: [] });
  const days = clampInt(req.query.days, 14, 1, 30);
  const articles = await cached(`win:${days * 24}`, 60_000, () => fetchWindow(days * 24, 1500))();
  const alertTypes = new Set(["SECURITY", "DEPRECATION", "OUTAGE"]);
  const alerts = groupEvents(articles.filter((a) => alertTypes.has(a.event_type)), stack)
    .filter((e) => e.matched.length)
    .sort((a, b) => b.max_impact - a.max_impact)
    .slice(0, 50);
  res.json({ stack, alerts });
}));

router.get("/api/stats", guard(async (req, res) => {
  const data = await cached("stats", 60_000, async () => {
    const { data, error } = await supabase
      .from("defrag_articles")
      .select("id,event_id,source_name,created_at,impact_score")
      .gte("published_at", hoursAgo(24))
      .limit(3000);
    if (error) throw new Error(error.message);
    const events = new Set(data.map((a) => a.event_id || a.id));
    return {
      articles_24h: data.length,
      events_24h: events.size,
      sources_active: new Set(data.map((a) => a.source_name)).size,
      sources_total: SOURCES.length,
      signal_24h: new Set(data.filter((a) => a.impact_score >= 70).map((a) => a.event_id || a.id)).size,
      last_ingest: runState.lastRun || data.map((a) => a.created_at).sort().pop() || null,
      running: runState.running,
    };
  })();
  res.json(data);
}));

router.get("/api/sources", (req, res) =>
  res.json({ sources: SOURCES.map(({ name, kind, trust }) => ({ name, kind, trust })), last_report: runState.lastReport })
);

// ---- Ask Defrag (RAG over the article base) ---------------------------------
const askHits = new Map();
const STOPWORDS = new Set("what which when where who whom whose why how is are was were be been the a an of to in on for and or with by at from about this that these those did does do has have had happened new latest recent tell me show give any anything".split(" "));

router.post("/api/ask", express.json({ limit: "4kb" }), guard(async (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  const hits = (askHits.get(ip) || []).filter((t) => now - t < 60_000);
  if (hits.length >= 6) return res.status(429).json({ error: "Rate limit: 6 questions per minute" });
  askHits.set(ip, [...hits, now]);

  const question = String(req.body?.question || "").trim().slice(0, 300);
  if (question.length < 3) return res.status(400).json({ error: "Question too short" });

  const words = [...new Set(question.toLowerCase().match(/[\p{L}\p{N}.+#-]{2,}/gu) || [])].filter((w) => !STOPWORDS.has(w)).slice(0, 8);
  if (!words.length) return res.json({ answer: "Ask about a specific technology, company or event.", sources: [] });

  const { data, error } = await supabase
    .from("defrag_articles")
    .select("id,title,summary,source_name,original_url,published_at,impact_score")
    .textSearch("fts", words.join(" or "), { type: "websearch", config: "english" })
    .order("published_at", { ascending: false })
    .limit(8);
  if (error) return res.status(500).json({ error: error.message });
  if (!data?.length) return res.json({ answer: "No matching articles in the Defrag database.", sources: [] });

  const context = data.map((a, i) => `[${i + 1}] ${a.title} (${a.source_name}, ${a.published_at.slice(0, 10)})\n${a.summary}`).join("\n\n");
  const answer = await answerFromContext(question, context);
  res.json({
    answer,
    sources: data.map((a, i) => ({ n: i + 1, title: a.title, url: a.original_url, source_name: a.source_name, published_at: a.published_at })),
  });
}));

// ---- Protected ingestion trigger -------------------------------------------
const safeEqual = (a = "", b = "") => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

function trigger(secret, res) {
  if (!config.isConfigured || !safeEqual(secret, config.secret)) return res.status(401).json({ error: "Unauthorized" });
  if (runState.running) return res.status(409).json({ status: "already_running" });
  res.json({ status: "started", timestamp: new Date().toISOString() });
  runDefragProcess().catch((err) => console.error("❌ Background ingestion error:", err));
}

router.post("/api/defrag/run", (req, res) => trigger(req.get("x-defrag-secret"), res));
// legacy (secret in the URL ends up in logs; kept for the existing button)
router.get("/api/defrag-now", (req, res) => trigger(req.query.secret, res));
