import Parser from "rss-parser";
import axios from "axios";

const UA = "Mozilla/5.0 (compatible; DefragBot/2.0; +https://defrag.wtf)";
const rss = new Parser({ timeout: 15000, headers: { "User-Agent": UA, Accept: "*/*" } });

/**
 * Source registry. `trust` (0..1) feeds the credibility score;
 * `kind` tells the pipeline how to treat the item:
 *   press     - general tech press
 *   vendor    - first-party engineering/product blogs (primary source)
 *   community - aggregators (HN, Lobsters): signal comes from votes
 *   advisory  - structured security feeds (no LLM needed, no scraping)
 */
export const SOURCES = [
  { name: "TechCrunch", kind: "press", trust: 0.65, type: "rss", url: "https://techcrunch.com/feed/" },
  { name: "The Verge", kind: "press", trust: 0.65, type: "rss", url: "https://www.theverge.com/rss/index.xml" },
  { name: "Wired", kind: "press", trust: 0.7, type: "rss", url: "https://www.wired.com/feed/rss" },
  { name: "Ars Technica", kind: "press", trust: 0.8, type: "rss", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { name: "The Register", kind: "press", trust: 0.7, type: "rss", url: "https://www.theregister.com/headlines.atom" },
  { name: "InfoQ", kind: "press", trust: 0.75, type: "rss", url: "https://feed.infoq.com/" },
  { name: "BleepingComputer", kind: "press", trust: 0.75, type: "rss", url: "https://www.bleepingcomputer.com/feed/" },
  { name: "GitHub Blog", kind: "vendor", trust: 0.85, type: "rss", url: "https://github.blog/feed/" },
  { name: "Cloudflare Blog", kind: "vendor", trust: 0.85, type: "rss", url: "https://blog.cloudflare.com/rss/" },
  { name: "Lobsters", kind: "community", trust: 0.6, type: "rss", url: "https://lobste.rs/rss" },
  { name: "Hacker News", kind: "community", trust: 0.6, type: "hn" },
  { name: "CISA KEV", kind: "advisory", trust: 0.98, type: "kev" },
];

export const trustByName = Object.fromEntries(SOURCES.map((s) => [s.name, s.trust]));
export const kindByName = Object.fromEntries(SOURCES.map((s) => [s.name, s.kind]));

/** Each fetcher returns normalized items: { title, link, publishedAt, source, text?, meta?, advisory? } */

async function fetchRss(src) {
  const feed = await rss.parseURL(src.url);
  return feed.items
    .filter((i) => i.link && i.title)
    .map((i) => ({
      title: i.title.trim(),
      link: i.link,
      publishedAt: new Date(i.isoDate || i.pubDate),
      source: src,
    }));
}

async function fetchHackerNews(src) {
  const base = "https://hacker-news.firebaseio.com/v0";
  const { data: ids } = await axios.get(`${base}/topstories.json`, { timeout: 10000 });
  const stories = await Promise.all(
    ids.slice(0, 40).map((id) =>
      axios.get(`${base}/item/${id}.json`, { timeout: 10000 }).then((r) => r.data).catch(() => null)
    )
  );
  return stories
    .filter((s) => s && s.type === "story" && s.url && s.score >= 80)
    .map((s) => ({
      title: s.title,
      link: s.url,
      publishedAt: new Date(s.time * 1000),
      source: src,
      meta: {
        hn_points: s.score,
        hn_comments: s.descendants || 0,
        discussion: `https://news.ycombinator.com/item?id=${s.id}`,
      },
    }));
}

async function fetchKev(src) {
  const { data } = await axios.get(
    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
    { timeout: 20000, headers: { "User-Agent": UA } }
  );
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  return (data.vulnerabilities || [])
    .filter((v) => new Date(v.dateAdded).getTime() > weekAgo)
    .slice(0, 15)
    .map((v) => ({
      title: `${v.cveID}: ${v.vulnerabilityName}`,
      link: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
      publishedAt: new Date(v.dateAdded),
      source: src,
      advisory: v,
    }));
}

const FETCHERS = { rss: fetchRss, hn: fetchHackerNews, kev: fetchKev };

/** Fetch every source in parallel; one failing source never breaks the run. */
export async function fetchAllSources(sources = SOURCES) {
  const results = await Promise.allSettled(
    sources.map(async (src) => ({ src, items: await FETCHERS[src.type](src) }))
  );
  const out = [];
  const report = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      out.push(...r.value.items);
      report.push({ source: sources[i].name, ok: true, count: r.value.items.length });
    } else {
      report.push({ source: sources[i].name, ok: false, error: r.reason?.message });
    }
  });
  return { items: out, report };
}
