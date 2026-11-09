import test from "node:test";
import assert from "node:assert/strict";
import { computeImpact, computeCredibility, extractCves } from "../server/scoring.js";
import { ClusterIndex, similarity, buildDoc } from "../server/cluster.js";
import { normalizeExtraction } from "../server/ai.js";
import { matchStack } from "../server/api.js";

test("impact: confirmed release with version outranks hyped opinion", () => {
  const release = computeImpact({ eventType: "RELEASE", confirmed: true, technicalDetail: 3, audience: 4, title: "React 19.1 released" });
  const opinion = computeImpact({ eventType: "OPINION", confirmed: false, technicalDetail: 0, audience: 3, title: "The future of AI will change everything" });
  assert.ok(release.score >= 80, `release=${release.score}`);
  assert.ok(opinion.score <= 5, `opinion=${opinion.score}`);
  assert.equal(release.breakdown.total, release.score);
});

test("impact: clamps to 0..100 and tolerates junk input", () => {
  const r = computeImpact({ eventType: "NOPE", confirmed: true, technicalDetail: 99, audience: 99, cveIds: ["CVE-2025-1"], title: "v1.2.3" });
  assert.ok(r.score >= 0 && r.score <= 100);
  assert.equal(r.breakdown.type, "OTHER");
});

test("credibility: corroboration and primary source raise the score", () => {
  const trust = { A: 0.65, B: 0.7, C: 0.85 };
  const kind = { A: "press", B: "press", C: "vendor" };
  const single = computeCredibility([{ source_name: "A" }], trust, kind);
  const multi = computeCredibility([{ source_name: "A" }, { source_name: "B" }, { source_name: "C" }], trust, kind);
  assert.ok(multi.score > single.score);
  assert.equal(multi.factors.primary_source, true);
  assert.equal(single.level, "low");
});

test("extractCves dedups and uppercases", () => {
  assert.deepEqual(extractCves("cve-2025-1234 and CVE-2025-1234, CVE-2024-99999"), ["CVE-2025-1234", "CVE-2024-99999"]);
});

const A = { id: 1, event_id: "e1", title: "OpenAI releases GPT-5 for developers", entities: [{ name: "OpenAI" }, { name: "GPT-5" }], cve_ids: [] };
const B = { title: "GPT-5 is here: OpenAI launches new model", entities: [{ name: "OpenAI" }, { name: "GPT-5" }], cve_ids: [] };
const C = { title: "Rust 1.90 stabilizes async closures", entities: [{ name: "Rust" }], cve_ids: [] };

test("cluster: same event matches, unrelated does not", () => {
  const idx = new ClusterIndex([A, { id: 2, event_id: "e2", title: C.title, entities: C.entities, cve_ids: [] }]);
  assert.equal(idx.match(B), "e1");
  assert.equal(idx.match({ title: "Linux 7.0 kernel merge window opens", entities: [{ name: "Linux" }], cve_ids: [] }), null);
});

test("cluster: shared CVE is a hard match", () => {
  const idx = new ClusterIndex([{ id: 1, event_id: "e9", title: "Zero-day in Foo", entities: [], cve_ids: ["CVE-2025-1111"] }]);
  assert.equal(idx.match({ title: "Totally different wording", entities: [], cve_ids: ["CVE-2025-1111"] }), "e9");
});

test("similarity is symmetric and bounded", () => {
  const s1 = similarity(buildDoc(A), buildDoc(B));
  const s2 = similarity(buildDoc(B), buildDoc(A));
  assert.ok(Math.abs(s1 - s2) < 1e-9 && s1 > 0 && s1 <= 1);
});

test("normalizeExtraction: repairs messy model output", () => {
  const out = normalizeExtraction({
    title: "x".repeat(200),
    summary: "- one\n- two",
    short_tag: "release!!",
    event_type: "release",
    confirmed: "true",
    entities: ["React", { name: "react", type: "tech" }, { name: "AWS", type: "company" }],
    stack_tags: ["React", "react", " AWS "],
  });
  assert.equal(out.title.length, 80);
  assert.equal(out.summary, "• one\n• two");
  assert.equal(out.short_tag, "RELEASE");
  assert.equal(out.event_type, "RELEASE");
  assert.equal(out.confirmed, true);
  assert.equal(out.entities.length, 2); // deduplicated case-insensitively
  assert.deepEqual(out.stack_tags, ["react", "aws"]);
  assert.throws(() => normalizeExtraction({ title: "no summary" }));
});

test("matchStack matches tags, entities and whole title words", () => {
  const a = { title: "Postgres 18 ships", stack_tags: ["postgresql"], entities: [{ name: "AWS" }] };
  assert.deepEqual(matchStack(a, ["postgresql", "aws", "react", "postgres"]), ["postgresql", "aws", "postgres"]);
});
