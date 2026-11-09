/**
 * Draws a sample from the database for human annotation.
 *   node eval/export-sample.js [N=300] [days=14] [seed=42]
 *
 * Writes TWO files so that annotation is blind (no anchoring on system output):
 *   eval/labels.json  - article content + EMPTY human fields  (annotator edits this)
 *   eval/system.json  - what the system predicted, keyed by id (read by evaluate.js)
 *
 * Sampling: 60% of items come from multi-article events (whole events, so that
 * cluster quality can be measured), 40% from singleton events. Both are random.
 */
import fs from "fs";
import { supabase } from "../server/db.js";
import { config } from "../server/config.js";
import { rng } from "./metrics.js";

const N = Number(process.argv[2]) || 300;
const DAYS = Number(process.argv[3]) || 14;
const SEED = Number(process.argv[4]) || 42;

if (!config.isConfigured) {
  console.error("Missing env:", config.missing.join(", "));
  process.exit(1);
}

const since = new Date(Date.now() - DAYS * 86400000).toISOString();
const { data, error } = await supabase
  .from("defrag_articles")
  .select("id,title,summary,original_url,source_name,published_at,impact_score,event_type,event_id,entities,cve_ids,stack_tags,short_tag")
  .gte("published_at", since)
  .limit(5000);
if (error) throw new Error(error.message);

const rand = rng(SEED);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const byEvent = new Map();
for (const a of data) {
  const k = a.event_id || a.id;
  (byEvent.get(k) || byEvent.set(k, []).get(k)).push(a);
}
const groups = shuffle([...byEvent.values()]);
const multi = groups.filter((g) => g.length > 1);
const single = groups.filter((g) => g.length === 1);

const picked = [];
for (const g of multi) { if (picked.length >= Math.round(N * 0.6)) break; picked.push(...g); }
for (const g of single) { if (picked.length >= N) break; picked.push(...g); }
const sample = picked.slice(0, N).sort((a, b) => new Date(a.published_at) - new Date(b.published_at));

const labels = {
  _instructions: [
    "Fill human_* fields for every item. Do NOT look at eval/system.json while annotating.",
    "human_impact (1-5): 1 = noise/opinion/tutorial, 2 = minor, 3 = relevant to a niche, 4 = important for many developers, 5 = industry-wide (major release, critical CVE, big outage).",
    "human_event_type: one of SECURITY OUTAGE RELEASE DEPRECATION ACQUISITION RESEARCH POLICY PRODUCT FUNDING RUMOR TUTORIAL OPINION OTHER.",
    "human_cluster: a short slug (e.g. 'gpt5-launch'); items about the SAME real-world event share the slug. Leave empty if the item is unique.",
    "human_faithful: true if every statement in the summary is supported by the source article (open the URL), false if anything is invented or distorted.",
  ],
  items: sample.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    url: a.original_url,
    source: a.source_name,
    published_at: a.published_at,
    human_impact: null,
    human_event_type: null,
    human_cluster: "",
    human_faithful: null,
  })),
};
const system = Object.fromEntries(
  sample.map((a) => [a.id, {
    impact_score: a.impact_score, event_type: a.event_type, event_id: a.event_id || a.id,
    entities: a.entities, cve_ids: a.cve_ids, title: a.title, source_name: a.source_name,
  }])
);

fs.writeFileSync("eval/labels.json", JSON.stringify(labels, null, 2));
fs.writeFileSync("eval/system.json", JSON.stringify(system, null, 2));
console.log(`Exported ${sample.length} items (${multi.length} multi-article events in pool) → eval/labels.json, eval/system.json`);
