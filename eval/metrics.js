/** Pure statistics helpers for the evaluation (no dependencies). */

export function rankAvg(xs) {
  const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[idx[k][1]] = r;
    i = j + 1;
  }
  return ranks;
}

export function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

export const spearman = (a, b) => pearson(rankAvg(a), rankAvg(b));

/** Kendall tau-b (handles ties). */
export function kendall(a, b) {
  let c = 0, d = 0, ta = 0, tb = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = i + 1; j < a.length; j++) {
      const x = Math.sign(a[i] - a[j]);
      const y = Math.sign(b[i] - b[j]);
      if (x === 0 && y === 0) continue;
      if (x === 0) ta++;
      else if (y === 0) tb++;
      else if (x === y) c++;
      else d++;
    }
  const denom = Math.sqrt((c + d + ta) * (c + d + tb));
  return denom ? (c - d) / denom : 0;
}

/** Seeded PRNG (mulberry32) so bootstrap results are reproducible. */
export function rng(seed = 42) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function bootstrapCI(a, b, stat = spearman, iters = 1000, seed = 42) {
  const rand = rng(seed);
  const n = a.length;
  const vals = [];
  for (let k = 0; k < iters; k++) {
    const xs = [], ys = [];
    for (let i = 0; i < n; i++) {
      const j = Math.floor(rand() * n);
      xs.push(a[j]);
      ys.push(b[j]);
    }
    vals.push(stat(xs, ys));
  }
  vals.sort((x, y) => x - y);
  return [vals[Math.floor(iters * 0.025)], vals[Math.floor(iters * 0.975)]];
}

export function prf(tp, fp, fn) {
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1 };
}

/** Classification report for string labels: accuracy, per-class and macro F1. */
export function classReport(truth, pred) {
  const labels = [...new Set([...truth, ...pred])].sort();
  const per = {};
  let correct = 0;
  truth.forEach((t, i) => { if (t === pred[i]) correct++; });
  for (const l of labels) {
    let tp = 0, fp = 0, fn = 0;
    truth.forEach((t, i) => {
      if (pred[i] === l && t === l) tp++;
      else if (pred[i] === l) fp++;
      else if (t === l) fn++;
    });
    per[l] = { ...prf(tp, fp, fn), support: truth.filter((t) => t === l).length };
  }
  const present = labels.filter((l) => per[l].support > 0);
  const macroF1 = present.reduce((s, l) => s + per[l].f1, 0) / (present.length || 1);
  return { accuracy: correct / truth.length, macroF1, per };
}

const choose2 = (n) => (n * (n - 1)) / 2;

/** Clustering metrics between two label arrays: pairwise P/R/F1 + Adjusted Rand Index. */
export function clusterMetrics(truth, pred) {
  const n = truth.length;
  const cont = new Map();
  const rows = new Map();
  const cols = new Map();
  for (let i = 0; i < n; i++) {
    const k = `${truth[i]}\u0000${pred[i]}`;
    cont.set(k, (cont.get(k) || 0) + 1);
    rows.set(truth[i], (rows.get(truth[i]) || 0) + 1);
    cols.set(pred[i], (cols.get(pred[i]) || 0) + 1);
  }
  const sumCont = [...cont.values()].reduce((s, v) => s + choose2(v), 0);
  const sumRows = [...rows.values()].reduce((s, v) => s + choose2(v), 0);
  const sumCols = [...cols.values()].reduce((s, v) => s + choose2(v), 0);
  const total = choose2(n);
  const expected = total ? (sumRows * sumCols) / total : 0;
  const max = (sumRows + sumCols) / 2;
  const ari = max === expected ? 1 : (sumCont - expected) / (max - expected);
  const tp = sumCont, fp = sumCols - sumCont, fn = sumRows - sumCont;
  return { ari, ...prf(tp, fp, fn), pairs: { tp, fp, fn } };
}

/** Wilson score interval for a proportion (95%). */
export function wilson(k, n, z = 1.96) {
  if (!n) return [0, 0];
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - m) / d, (c + m) / d];
}
