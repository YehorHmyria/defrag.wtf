import { randomUUID } from "crypto";
import { config } from "./config.js";
import { supabase } from "./db.js";
import { fetchAllSources } from "./sources.js";
import { scrapeArticleContent } from "./scrape.js";
import { extractFeatures, extractAdvisory } from "./ai.js";
import { computeImpact, extractCves } from "./scoring.js";
import { ClusterIndex } from "./cluster.js";

export const runState = { running: false, lastRun: null, lastReport: null };

/** Round-robin across sources so one chatty feed can't starve the others. */
function balance(items, limit) {
  const bySource = new Map();
  for (const it of items) {
    if (!bySource.has(it.source.name)) bySource.set(it.source.name, []);
    bySource.get(it.source.name).push(it);
  }
  bySource.forEach((list) => list.sort((a, b) => b.publishedAt - a.publishedAt));
  const out = [];
  while (out.length < limit && [...bySource.values()].some((l) => l.length)) {
    for (const list of bySource.values()) if (list.length && out.length < limit) out.push(list.shift());
  }
  return out;
}

async function existingUrls(urls) {
  const found = new Set();
  for (let i = 0; i < urls.length; i += 100) {
    const { data } = await supabase.from("defrag_articles").select("original_url").in("original_url", urls.slice(i, i + 100));
    (data || []).forEach((r) => found.add(r.original_url));
  }
  return found;
}

async function loadClusterIndex() {
  const since = new Date(Date.now() - config.clusterWindowHours * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("defrag_articles")
    .select("id,title,entities,cve_ids,event_id")
    .gte("published_at", since)
    .not("event_id", "is", null)
    .limit(1500);
  if (error) console.warn("⚠️  Cluster index load failed (is migration 002 applied?):", error.message);
  return new ClusterIndex(data || []);
}

async function processItem(item, index, stats) {
  const src = item.source;
  let features;
  if (item.advisory) {
    features = extractAdvisory(item.advisory);
  } else {
    const text = await scrapeArticleContent(item.link);
    if (text.length < 100) {
      stats.skipped++;
      return;
    }
    features = await extractFeatures(text, item.title, src.name);
    if (!features) {
      stats.errors++;
      return;
    }
    features.cve_ids = extractCves(`${item.title} ${text.substring(0, 4000)}`);
  }
  const cveIds = features.cve_ids ?? extractCves(item.title);

  const { score, breakdown } = computeImpact({
    eventType: features.event_type,
    confirmed: features.confirmed,
    technicalDetail: features.technical_detail,
    audience: features.audience,
    cveIds,
    title: features.title,
  });

  const row = {
    title: features.title,
    summary: features.summary,
    short_tag: features.short_tag,
    impact_score: score,
    original_url: item.link,
    source_name: src.name,
    source_kind: src.kind,
    published_at: item.publishedAt,
    title_uk: features.title_uk,
    summary_uk: features.summary_uk,
    event_type: features.event_type,
    entities: features.entities,
    stack_tags: features.stack_tags,
    cve_ids: cveIds,
    score_breakdown: breakdown,
    meta: item.meta || {},
  };

  const probe = { title: row.title, entities: row.entities, cve_ids: row.cve_ids };
  row.event_id = index.match(probe) || randomUUID();
  // Register in the index synchronously (before the awaited insert) so that
  // concurrent workers see this item and cluster into the same event.
  index.add({ ...probe, id: null, event_id: row.event_id });

  const { error } = await supabase.from("defrag_articles").insert([row]);
  if (error) {
    if (error.code === "23505") stats.duplicates++;
    else {
      console.error("   ❌ DB error:", error.message);
      stats.errors++;
    }
    return;
  }
  stats.saved++;
  console.log(`   ✅ [${src.name}] ${row.title} (${row.event_type}, impact ${score})`);
}

export async function runDefragProcess() {
  if (runState.running) {
    console.log("⏭️  Ingestion already running, skipping");
    return null;
  }
  runState.running = true;
  const started = Date.now();
  const stats = { fetched: 0, fresh: 0, queued: 0, saved: 0, duplicates: 0, skipped: 0, errors: 0 };

  try {
    console.log("\n🔧 Starting ingestion...");
    const { items, report } = await fetchAllSources();
    stats.fetched = items.length;

    const cutoff = Date.now() - config.windowHours * 3600 * 1000;
    const recent = items.filter((i) => i.publishedAt.getTime() > cutoff);
    const known = await existingUrls(recent.map((i) => i.link));
    const fresh = recent.filter((i) => !known.has(i.link));
    stats.fresh = fresh.length;

    const queue = balance(fresh, config.maxPerRun);
    stats.queued = queue.length;
    console.log(`   ${items.length} fetched → ${fresh.length} new → ${queue.length} queued`);

    const index = await loadClusterIndex();
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const item = queue[cursor++];
        try {
          await processItem(item, index, stats);
        } catch (err) {
          console.error("   ❌ Item failed:", err.message);
          stats.errors++;
        }
      }
    };
    await Promise.all(Array.from({ length: config.concurrency }, worker));

    stats.duration_s = Number(((Date.now() - started) / 1000).toFixed(1));
    runState.lastReport = { stats, sources: report };
    console.log("✨ Ingestion complete:", stats);
    return stats;
  } finally {
    runState.running = false;
    runState.lastRun = new Date().toISOString();
  }
}
