/**
 * Evaluates the system against human labels.
 *   node eval/evaluate.js [eval/labels.json] [eval/system.json]
 * Writes eval/report.md and eval/report.json.
 */
import fs from "fs";
import { spearman, kendall, bootstrapCI, prf, classReport, clusterMetrics, wilson } from "./metrics.js";
import { ClusterIndex } from "../server/cluster.js";
import { trustByName } from "../server/sources.js";

export function keywordBaseline(title = "") {
  // The heuristic from the ORIGINAL prompt (v1): reward/penalise keywords.
  const t = title.toLowerCase();
  let s = 50;
  for (const w of ["opinion", "future of", "predicts", "could", "may ", "revolutionize", "mainstream", "game changer"]) if (t.includes(w)) s -= 20;
  for (const w of ["v1.0", "cve-", "released", "benchmark", "latency", "deprecated", "open source", "release", "vulnerab", "outage"]) if (t.includes(w)) s += 20;
  return s;
}

const f = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : "n/a");

export function evaluate(labels, system) {
  const items = labels.items.filter((i) => system[i.id]);
  const out = { n_total: labels.items.length, sections: {} };

  // ---- 1. impact ranking ---------------------------------------------------
  const rated = items.filter((i) => Number.isFinite(i.human_impact));
  if (rated.length >= 10) {
    const h = rated.map((i) => i.human_impact);
    const predictors = {
      "Defrag (hybrid, deterministic)": rated.map((i) => system[i.id].impact_score),
      "Baseline: v1 keyword heuristic": rated.map((i) => keywordBaseline(i.title)),
      "Baseline: source trust only": rated.map((i) => trustByName[i.source] ?? 0.5),
    };
    const rows = Object.entries(predictors).map(([name, p]) => {
      const [lo, hi] = bootstrapCI(p, h);
      return { name, spearman: spearman(p, h), ci: [lo, hi], kendall: kendall(p, h) };
    });
    // SIGNAL threshold (>=70) vs human >=4
    let tp = 0, fp = 0, fn = 0;
    rated.forEach((i) => {
      const pos = system[i.id].impact_score >= 70, truth = i.human_impact >= 4;
      if (pos && truth) tp++; else if (pos) fp++; else if (truth) fn++;
    });
    out.sections.impact = { n: rated.length, rows, signal: prf(tp, fp, fn) };
  }

  // ---- 2. event type -------------------------------------------------------
  const typed = items.filter((i) => i.human_event_type);
  if (typed.length >= 10) {
    out.sections.type = { n: typed.length, ...classReport(typed.map((i) => i.human_event_type.toUpperCase()), typed.map((i) => system[i.id].event_type || "OTHER")) };
  }

  // ---- 3. clustering + threshold sweep ------------------------------------
  const truthCluster = items.map((i) => i.human_cluster?.trim() || `__single_${i.id}`);
  if (items.some((i) => i.human_cluster?.trim())) {
    const live = clusterMetrics(truthCluster, items.map((i) => system[i.id].event_id));
    const sweep = [0.3, 0.4, 0.5, 0.6, 0.7].map((th) => {
      const idx = new ClusterIndex([], { threshold: th });
      const ordered = [...items].sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
      const assign = new Map();
      ordered.forEach((it, k) => {
        const s = system[it.id];
        const probe = { title: s.title, entities: s.entities, cve_ids: s.cve_ids };
        const ev = idx.match(probe) || `ev${k}`;
        idx.add({ ...probe, id: it.id, event_id: ev });
        assign.set(it.id, ev);
      });
      return { threshold: th, ...clusterMetrics(truthCluster, items.map((i) => assign.get(i.id))) };
    });
    out.sections.cluster = { n: items.length, live, sweep };
  }

  // ---- 4. summary faithfulness --------------------------------------------
  const judged = items.filter((i) => typeof i.human_faithful === "boolean");
  if (judged.length) {
    const ok = judged.filter((i) => i.human_faithful).length;
    out.sections.faithful = { n: judged.length, rate: ok / judged.length, ci: wilson(ok, judged.length) };
  }
  return out;
}

export function toMarkdown(r) {
  const L = [`# Evaluation report`, ``, `Items in sample: **${r.n_total}**`, ``];
  const s = r.sections;
  if (s.impact) {
    L.push(`## 1. Impact scoring (n=${s.impact.n})`, ``, `Rank correlation with human ratings (1–5). 95% bootstrap CI.`, ``,
      `| Method | Spearman ρ | 95% CI | Kendall τ |`, `|---|---|---|---|`,
      ...s.impact.rows.map((x) => `| ${x.name} | ${f(x.spearman)} | [${f(x.ci[0])}, ${f(x.ci[1])}] | ${f(x.kendall)} |`), ``,
      `SIGNAL threshold (impact ≥ 70 vs human ≥ 4): precision ${f(s.impact.signal.precision)}, recall ${f(s.impact.signal.recall)}, F1 ${f(s.impact.signal.f1)}`, ``);
  }
  if (s.type) {
    L.push(`## 2. Event-type classification (n=${s.type.n})`, ``, `Accuracy **${f(s.type.accuracy)}**, macro-F1 **${f(s.type.macroF1)}**`, ``,
      `| Type | P | R | F1 | Support |`, `|---|---|---|---|---|`,
      ...Object.entries(s.type.per).filter(([, v]) => v.support).map(([k, v]) => `| ${k} | ${f(v.precision, 2)} | ${f(v.recall, 2)} | ${f(v.f1, 2)} | ${v.support} |`), ``);
  }
  if (s.cluster) {
    L.push(`## 3. Event clustering (n=${s.cluster.n})`, ``,
      `Production setting (threshold 0.5): ARI ${f(s.cluster.live.ari)}, pairwise P ${f(s.cluster.live.precision)}, R ${f(s.cluster.live.recall)}, F1 ${f(s.cluster.live.f1)}`, ``,
      `Threshold ablation (re-clustered offline in publication order):`, ``,
      `| Threshold | ARI | Pair P | Pair R | Pair F1 |`, `|---|---|---|---|---|`,
      ...s.cluster.sweep.map((x) => `| ${x.threshold} | ${f(x.ari)} | ${f(x.precision)} | ${f(x.recall)} | ${f(x.f1)} |`), ``);
  }
  if (s.faithful) {
    L.push(`## 4. Summary faithfulness (n=${s.faithful.n})`, ``, `Fully supported summaries: **${f(s.faithful.rate * 100, 1)}%** (95% Wilson CI ${f(s.faithful.ci[0] * 100, 1)}–${f(s.faithful.ci[1] * 100, 1)}%)`, ``);
  }
  if (!Object.keys(s).length) L.push("_No annotated items yet: fill the human_* fields in eval/labels.json._");
  return L.join("\n");
}

if (process.argv[1] && process.argv[1].endsWith("evaluate.js")) {
  const [lp = "eval/labels.json", sp = "eval/system.json"] = process.argv.slice(2);
  const result = evaluate(JSON.parse(fs.readFileSync(lp, "utf8")), JSON.parse(fs.readFileSync(sp, "utf8")));
  fs.writeFileSync("eval/report.json", JSON.stringify(result, null, 2));
  const md = toMarkdown(result);
  fs.writeFileSync("eval/report.md", md);
  console.log(md);
}
