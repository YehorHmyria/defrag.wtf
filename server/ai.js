import Groq from "groq-sdk";
import { config } from "./config.js";
import { EVENT_TYPES } from "./scoring.js";

const groq = config.groqKey ? new Groq({ apiKey: config.groqKey }) : null;

const SYSTEM_PROMPT = `You are a feature extractor for a tech-news hub read by software engineers.
You do NOT rate importance. You only extract facts and classify. Be literal and skeptical of marketing language.

Return ONLY valid JSON:
{
  "title": "Neutral factual headline, max 60 chars, no clickbait",
  "summary": ["fact 1", "fact 2", "fact 3"],
  "short_tag": "ONE WORD IN CAPS, e.g. RELEASE, CVE, OUTAGE, AI, BENCHMARK",
  "event_type": "one of: ${EVENT_TYPES.join(" | ")}",
  "confirmed": true if the facts come from an official source/announcement/advisory, false for rumors, leaks, analyst predictions,
  "technical_detail": 0-3 (0 = no technical specifics, 3 = versions, numbers, APIs, CVE ids, benchmarks),
  "audience": 1-5 (1 = niche, 3 = a sizeable developer community, 5 = most of the industry is affected),
  "entities": [{"name": "React", "type": "TECH|COMPANY|PRODUCT|PERSON"}],
  "stack_tags": ["lowercase technologies a developer would list in their stack, e.g. react, postgresql, aws, python, kubernetes"]${
    config.enableUk
      ? `,
  "title_uk": "Title in Ukrainian",
  "summary_uk": ["fact 1 in Ukrainian", "fact 2", "fact 3"]`
      : ""
  }
}
Rules: max 8 entities, max 6 stack_tags, facts only (no opinions, no adjectives like "revolutionary"). Keep product/library names in English.`;

/** Pure: coerce arbitrary model output into a safe, validated shape. */
export function normalizeExtraction(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Not an object");
  const arr = (v) => (Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : []);
  const bullets = (v) =>
    arr(v)
      .map((s) => String(s).replace(/^[•\-*\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 5)
      .map((s) => `• ${s}`)
      .join("\n");

  const summary = bullets(raw.summary);
  if (!raw.title || !summary) throw new Error("Missing title/summary");

  const eventType = String(raw.event_type || "OTHER").toUpperCase();
  const seen = new Set();
  const entities = arr(raw.entities)
    .map((e) => (typeof e === "string" ? { name: e, type: "TECH" } : e))
    .filter((e) => e && e.name && String(e.name).length < 60)
    .map((e) => ({ name: String(e.name).trim(), type: String(e.type || "TECH").toUpperCase() }))
    .filter((e) => (seen.has(e.name.toLowerCase()) ? false : seen.add(e.name.toLowerCase())))
    .slice(0, 8);

  return {
    title: String(raw.title).slice(0, 80),
    summary,
    short_tag: String(raw.short_tag || "NEWS").toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 14) || "NEWS",
    event_type: EVENT_TYPES.includes(eventType) ? eventType : "OTHER",
    confirmed: raw.confirmed === true || raw.confirmed === "true",
    technical_detail: Number(raw.technical_detail) || 0,
    audience: Number(raw.audience) || 3,
    entities,
    stack_tags: [...new Set(arr(raw.stack_tags).map((s) => String(s).toLowerCase().trim()).filter(Boolean))].slice(0, 6),
    title_uk: raw.title_uk ? String(raw.title_uk).slice(0, 120) : null,
    summary_uk: raw.summary_uk ? bullets(raw.summary_uk) : null,
  };
}

/** Minimum gap between LLM calls + retry on 429 (honours Retry-After). */
class RateLimiter {
  constructor(minIntervalMs) {
    this.minIntervalMs = minIntervalMs;
    this.nextSlot = 0;
  }
  async wait() {
    const now = Date.now();
    const at = Math.max(now, this.nextSlot);
    this.nextSlot = at + this.minIntervalMs;
    if (at > now) await new Promise((r) => setTimeout(r, at - now));
  }
}
const limiter = new RateLimiter(config.llmMinIntervalMs);

async function chat(params, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    await limiter.wait();
    try {
      return await groq.chat.completions.create({ model: config.groqModel, ...params });
    } catch (err) {
      const retryable = err.status === 429 || err.status >= 500;
      if (!retryable || i === attempts) throw err;
      const retryAfter = Number(err.headers?.["retry-after"]) || 5 * i;
      console.warn(`   ⏳ LLM ${err.status}, retry ${i}/${attempts - 1} in ${retryAfter}s`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
    }
  }
}

export async function extractFeatures(articleText, title, source) {
  try {
    const completion = await chat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `SOURCE: ${source}\nORIGINAL TITLE: ${title}\nARTICLE TEXT:\n${articleText.substring(0, 8000)}` },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });
    const text = (completion.choices[0]?.message?.content || "").replace(/```json\n?|```\n?/g, "").trim();
    return normalizeExtraction(JSON.parse(text));
  } catch (error) {
    console.error("❌ AI extraction failed:", error.message);
    return null;
  }
}

/** Structured advisory (CISA KEV) needs no LLM: facts are already structured. */
export function extractAdvisory(v) {
  const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9.+# -]/g, "").trim();
  const entities = [v.vendorProject, v.product]
    .filter(Boolean)
    .map((n, i) => ({ name: n, type: i === 0 ? "COMPANY" : "PRODUCT" }));
  return {
    title: `${v.cveID}: ${v.product}`.slice(0, 80),
    summary: [
      `${v.vendorProject} ${v.product}: ${v.vulnerabilityName}`,
      v.shortDescription,
      `Required action: ${v.requiredAction}`,
      v.knownRansomwareCampaignUse === "Known" ? "Used in ransomware campaigns." : null,
    ]
      .filter(Boolean)
      .map((s) => `• ${s}`)
      .join("\n"),
    short_tag: "CVE",
    event_type: "SECURITY",
    confirmed: true,
    technical_detail: 3,
    audience: 4,
    entities,
    stack_tags: [...new Set([slug(v.vendorProject), slug(v.product)].filter(Boolean))],
    title_uk: null,
    summary_uk: null,
  };
}

/** RAG answer generation for /api/ask. */
export async function answerFromContext(question, context) {
  const completion = await chat({
    messages: [
      {
        role: "system",
        content:
          "You answer questions about recent tech news USING ONLY the numbered sources provided. " +
          "Cite sources inline as [1], [2]. If the sources do not contain the answer, say so plainly. " +
          "Be concise (max 6 sentences). Answer in the same language as the question.",
      },
      { role: "user", content: `SOURCES:\n${context}\n\nQUESTION: ${question}` },
    ],
    temperature: 0.2,
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}
