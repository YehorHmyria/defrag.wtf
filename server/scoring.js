/**
 * Deterministic, explainable scoring.
 *
 * The LLM only EXTRACTS features (event type, confirmed?, technical detail,
 * audience size). The score itself is computed here, so it is reproducible,
 * testable, and each point can be explained to the user (score_breakdown).
 */

export const EVENT_TYPES = [
  "SECURITY", "OUTAGE", "RELEASE", "DEPRECATION", "ACQUISITION", "RESEARCH",
  "POLICY", "PRODUCT", "FUNDING", "RUMOR", "TUTORIAL", "OPINION", "OTHER",
];

const BASE = {
  SECURITY: 70, OUTAGE: 70, DEPRECATION: 65, RELEASE: 60, ACQUISITION: 50,
  RESEARCH: 45, POLICY: 45, PRODUCT: 40, FUNDING: 30, RUMOR: 20,
  TUTORIAL: 10, OPINION: 5, OTHER: 25,
};

const HYPE = /\b(revolutioni[sz]e|game[- ]changer|future of|the end of|killer|disrupt|predicts?|will change)\b/i;
const VERSION = /\bv?\d+\.\d+(\.\d+)?\b/;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function computeImpact({ eventType, confirmed, technicalDetail, audience, cveIds = [], title = "" }) {
  const type = EVENT_TYPES.includes(eventType) ? eventType : "OTHER";
  const parts = {
    base: BASE[type],
    technical_detail: clamp(Math.round(technicalDetail ?? 0), 0, 3) * 5,
    audience: (clamp(Math.round(audience ?? 3), 1, 5) - 3) * 6,
    confirmed: confirmed ? 5 : -10,
    cve: cveIds.length ? 8 : 0,
    version: VERSION.test(title) ? 5 : 0,
    hype: HYPE.test(title) ? -10 : 0,
  };
  const raw = Object.values(parts).reduce((a, b) => a + b, 0);
  return { score: clamp(Math.round(raw), 0, 100), breakdown: { type, ...parts, total: clamp(Math.round(raw), 0, 100) } };
}

/**
 * Credibility of an EVENT (cluster of articles).
 *   40% source trust  + up to 36 pts for independent corroboration
 *   + 14 pts if there is a primary source (vendor / advisory / CVE)
 */
export function computeCredibility(articles, trustByName, kindByName) {
  const sources = [...new Set(articles.map((a) => a.source_name))];
  const avgTrust = sources.reduce((s, n) => s + (trustByName[n] ?? 0.5), 0) / (sources.length || 1);
  const corroboration = (Math.min(sources.length, 4) - 1) * 12;
  const primary = articles.some(
    (a) => ["vendor", "advisory"].includes(kindByName[a.source_name]) || (a.cve_ids?.length ?? 0) > 0
  );
  const score = clamp(Math.round(avgTrust * 50 + corroboration + (primary ? 14 : 0)), 0, 100);
  return {
    score,
    level: score >= 75 ? "high" : score >= 50 ? "medium" : "low",
    factors: { sources: sources.length, avg_trust: Number(avgTrust.toFixed(2)), primary_source: primary },
  };
}

export const CVE_RE = /CVE-\d{4}-\d{4,7}/gi;
export function extractCves(text) {
  return [...new Set((text.match(CVE_RE) || []).map((c) => c.toUpperCase()))];
}
