import test from "node:test";
import assert from "node:assert/strict";
import { spearman, kendall, clusterMetrics, classReport, wilson, rankAvg, bootstrapCI } from "../eval/metrics.js";
import { evaluate, toMarkdown } from "../eval/evaluate.js";

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test("rankAvg handles ties", () => assert.deepEqual(rankAvg([10, 20, 20, 30]), [1, 2.5, 2.5, 4]));

test("spearman/kendall: perfect, inverse, known value", () => {
  near(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
  near(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
  near(kendall([1, 2, 3, 4], [1, 3, 2, 4]), 4 / 6); // 5 concordant, 1 discordant
  // classic textbook example: rho = -0.1757575...
  near(spearman([86, 97, 99, 100, 101, 103, 106, 110, 112, 113], [2, 20, 28, 27, 50, 29, 7, 17, 6, 12]), -0.17575757, 1e-6);
});

test("clusterMetrics: identical = ARI 1; independent ~ 0; split lowers recall", () => {
  const t = ["a", "a", "b", "b", "c"];
  const same = clusterMetrics(t, ["x", "x", "y", "y", "z"]);
  near(same.ari, 1); near(same.f1, 1);
  const split = clusterMetrics(t, ["1", "2", "3", "4", "5"]);
  near(split.recall, 0); assert.ok(split.ari < 0.1);
  const merged = clusterMetrics(t, ["q", "q", "q", "q", "q"]);
  near(merged.recall, 1); assert.ok(merged.precision < 1);
});

test("classReport computes accuracy and macro-F1", () => {
  const r = classReport(["A", "A", "B", "B"], ["A", "B", "B", "B"]);
  near(r.accuracy, 0.75);
  near(r.per.B.precision, 2 / 3); near(r.per.B.recall, 1);
  near(r.macroF1, (r.per.A.f1 + r.per.B.f1) / 2);
});

test("wilson interval brackets the proportion", () => {
  const [lo, hi] = wilson(45, 50);
  assert.ok(lo < 0.9 && hi > 0.9 && lo > 0.75 && hi < 0.98);
  assert.deepEqual(wilson(0, 0), [0, 0]);
});

test("bootstrapCI is reproducible with a seed", () => {
  const a = Array.from({ length: 30 }, (_, i) => i), b = a.map((x) => x + (x % 5));
  assert.deepEqual(bootstrapCI(a, b, spearman, 200, 1), bootstrapCI(a, b, spearman, 200, 1));
});

test("evaluate(): end-to-end on a small SYNTHETIC fixture (not real data)", () => {
  const mk = (i, impact, h, type, cl) => ({ id: `i${i}`, title: `Title ${i} released`, source: "Wired", published_at: new Date(2026, 0, 1, i).toISOString(), human_impact: h, human_event_type: type, human_cluster: cl, human_faithful: i % 4 !== 0 });
  const items = Array.from({ length: 12 }, (_, i) => mk(i, 0, (i % 5) + 1, i % 2 ? "RELEASE" : "SECURITY", i < 2 ? "dup" : ""));
  const system = Object.fromEntries(items.map((it, i) => [it.id, { impact_score: ((i % 5) + 1) * 18, event_type: i % 2 ? "RELEASE" : "SECURITY", event_id: i < 2 ? "e0" : `e${i}`, entities: [], cve_ids: [], title: it.title, source_name: "Wired" }]));
  const r = evaluate({ items }, system);
  assert.ok(r.sections.impact.rows[0].spearman > 0.99);
  near(r.sections.type.accuracy, 1);
  near(r.sections.cluster.live.ari, 1);
  assert.equal(r.sections.cluster.sweep.length, 5);
  assert.ok(toMarkdown(r).includes("Spearman"));
});
