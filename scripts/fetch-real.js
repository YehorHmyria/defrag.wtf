/** Dump recent real items (with scraped text) to a JSON file, for manual/offline extraction. Usage: node scripts/fetch-real.js out.json [limit] */
import fs from "fs";
import { fetchAllSources } from "../server/sources.js";
import { scrapeArticleContent } from "../server/scrape.js";

const out = process.argv[2] || "real-items.json";
const limit = Number(process.argv[3]) || 40;
const { items } = await fetchAllSources();
const cutoff = Date.now() - 72 * 3600 * 1000;
const by = new Map();
for (const it of items.filter((i) => i.publishedAt.getTime() > cutoff).sort((a, b) => b.publishedAt - a.publishedAt)) {
  if (!by.has(it.source.name)) by.set(it.source.name, []);
  by.get(it.source.name).push(it);
}
const picked = [];
while (picked.length < limit && [...by.values()].some((l) => l.length)) for (const l of by.values()) if (l.length && picked.length < limit) picked.push(l.shift());
const res = [];
for (let i = 0; i < picked.length; i += 6) {
  await Promise.all(picked.slice(i, i + 6).map(async (it) => {
    const text = it.advisory ? JSON.stringify(it.advisory) : await scrapeArticleContent(it.link).catch(() => "");
    res.push({ id: res.length, source: it.source.name, title: it.title, url: it.link, publishedAt: it.publishedAt, meta: it.meta || {}, text: text.slice(0, 1500) });
  }));
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log(`wrote ${res.length} items`);
