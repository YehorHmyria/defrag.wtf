/**
 * Event clustering: group articles that describe the same real-world event.
 *
 * Method (baseline, no external API): weighted bag-of-terms vectors
 *   - title words (weight 1), entity names (weight 3), CVE ids (weight 6)
 *   - IDF computed over the recent corpus, cosine similarity, threshold.
 * A shared CVE id is a hard match. The `threshold` is tunable with test/eval.
 * An embedding-based matcher (pgvector) can replace `similarity()` 1:1.
 */

const STOP = new Set(
  "a an the of to in on for and or with by at from as is are was were be been it its this that these those new how why what who after before over about into up out says said will would could may more most than via vs not no you your we our their his her they them".split(" ")
);

export function tokenize(str = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9.+#\- ]+/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export function buildDoc(article) {
  const doc = new Map();
  const add = (t, w) => doc.set(t, Math.max(doc.get(t) || 0, w));
  tokenize(article.title).forEach((t) => add(t, 1));
  for (const e of article.entities || []) {
    const name = String(e.name || "").toLowerCase();
    if (!name) continue;
    add(name, 3);
    tokenize(name).forEach((t) => add(t, 2));
  }
  for (const c of article.cve_ids || []) add(c.toLowerCase(), 6);
  return doc;
}

export function similarity(a, b, idf = () => 1) {
  let dot = 0, na = 0, nb = 0;
  for (const [t, w] of a) {
    const x = w * idf(t);
    na += x * x;
    if (b.has(t)) dot += x * (b.get(t) * idf(t));
  }
  for (const [t, w] of b) {
    const y = w * idf(t);
    nb += y * y;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export class ClusterIndex {
  constructor(candidates = [], { threshold = 0.5 } = {}) {
    this.threshold = threshold;
    this.items = [];
    candidates.forEach((c) => this.add(c));
  }

  add(article) {
    this.items.push({ id: article.id, eventId: article.event_id, cves: article.cve_ids || [], doc: buildDoc(article) });
  }

  _idf() {
    const N = this.items.length;
    const df = new Map();
    for (const it of this.items) for (const t of it.doc.keys()) df.set(t, (df.get(t) || 0) + 1);
    return (t) => Math.log((N + 1) / ((df.get(t) || 0) + 1)) + 1;
  }

  /** Returns the event_id of the best matching existing article, or null. */
  match(article) {
    if (!this.items.length) return null;
    const doc = buildDoc(article);
    const cves = article.cve_ids || [];
    const idf = this._idf();
    let best = { score: 0, eventId: null };
    for (const it of this.items) {
      if (cves.length && it.cves.some((c) => cves.includes(c))) return it.eventId;
      const s = similarity(doc, it.doc, idf);
      if (s > best.score) best = { score: s, eventId: it.eventId };
    }
    return best.score >= this.threshold ? best.eventId : null;
  }
}
