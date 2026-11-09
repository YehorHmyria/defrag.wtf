/**
 * "Untangle" scene: a hairball of news that a DEFRAG sweep pulls into clean event clusters.
 *
 *   buildScene(seed, labels)  -> deterministic scene in normalised 0..1 space
 *   drawScene(ctx, scene, t, time, w, h, colors) -> one frame
 *
 * t    = progress 0..1 (0 = tangled, 1 = defragged)
 * time = seconds, only drives the idle jitter of still-tangled nodes
 */

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (x) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export const FALLBACK_LABELS = ['RELEASE', 'SECURITY', 'OUTAGE', 'AI', 'OPEN SOURCE', 'CLOUD', 'HARDWARE', 'POLICY', 'RESEARCH'];

export function buildScene(seed = 7, labels = FALLBACK_LABELS) {
  const rand = rng(seed);
  const K = Math.min(9, labels.length);
  const nodes = [];
  const clusters = [];

  // clean layout: jittered 3x3 grid of cluster centres
  const cols = 3, rows = Math.ceil(K / cols);
  for (let c = 0; c < K; c++) {
    const cx = ((c % cols) + 0.5) / cols + (rand() - 0.5) * 0.05;
    const cy = (Math.floor(c / cols) + 0.5) / rows + (rand() - 0.5) * 0.05;
    clusters.push({ id: c, cx, cy, label: labels[c], hub: -1, size: 0 });
  }

  // hairball: three dense knots + scattered strays
  const knots = [[0.3, 0.35], [0.65, 0.6], [0.45, 0.8]];
  const tangledPos = () => {
    if (rand() < 0.72) {
      const [kx, ky] = knots[Math.floor(rand() * knots.length)];
      const a = rand() * Math.PI * 2, r = Math.sqrt(-2 * Math.log(1 - rand())) * 0.11;
      return [kx + Math.cos(a) * r, ky + Math.sin(a) * r];
    }
    return [0.05 + rand() * 0.9, 0.05 + rand() * 0.9];
  };

  for (const cl of clusters) {
    const n = 7 + Math.floor(rand() * 9);
    cl.size = n;
    for (let i = 0; i < n; i++) {
      const [tx, ty] = tangledPos();
      const hub = i === 0;
      const ang = rand() * Math.PI * 2;
      const rad = hub ? 0 : (0.035 + rand() * 0.05) * (0.6 + Math.sqrt(n) / 4);
      nodes.push({
        id: nodes.length, cluster: cl.id, hub,
        tx: Math.min(0.97, Math.max(0.03, tx)), ty: Math.min(0.97, Math.max(0.03, ty)),
        cx: cl.cx + Math.cos(ang) * rad, cy: cl.cy + Math.sin(ang) * rad * 0.9,
        phase: rand() * Math.PI * 2, wob: 0.004 + rand() * 0.008,
        r: hub ? 4.2 : 1.6 + rand() * 1.4,
      });
      if (hub) cl.hub = nodes.length - 1;
    }
  }

  // tangled edges: every node grabs 3 random others (mostly across clusters) => mess
  const tangled = [];
  for (const a of nodes) {
    for (let k = 0; k < 3; k++) {
      let b = nodes[Math.floor(rand() * nodes.length)];
      if (b.id === a.id) continue;
      tangled.push([a.id, b.id]);
    }
  }
  // clean edges: star to the hub of the cluster + a few hub-to-hub "entity" links
  const clean = [];
  for (const n of nodes) if (!n.hub) clean.push([n.id, clusters[n.cluster].hub]);
  const links = [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [0, 3], [1, 4], [2, 5], [4, 7], [5, 8]]
    .filter(([a, b]) => a < K && b < K)
    .map(([a, b]) => [clusters[a].hub, clusters[b].hub]);

  return { nodes, clusters, tangled, clean, links };
}

/** Per-node local progress: a vertical "defrag head" sweeps across, defragmenting what it passes. */
export function nodeProgress(scene, t) {
  const head = -0.2 + 1.4 * easeInOut(t);
  const feather = 0.22;
  return scene.nodes.map((n) => smooth((head - n.tx) / feather));
}

export function sweepX(t) {
  return -0.2 + 1.4 * easeInOut(t);
}

export function drawScene(ctx, scene, t, time, w, h, colors) {
  const { bg, accent } = colors; // "r g b" strings
  const rgba = (c, a) => `rgba(${c.replace(/ /g, ',')},${a})`;
  ctx.clearRect(0, 0, w, h);

  const prog = nodeProgress(scene, t);
  const pos = scene.nodes.map((n, i) => {
    const p = prog[i];
    const jx = Math.sin(time * 1.1 + n.phase) * n.wob * (1 - p);
    const jy = Math.cos(time * 0.9 + n.phase * 1.3) * n.wob * (1 - p);
    return [(n.tx + (n.cx - n.tx) * p + jx) * w, (n.ty + (n.cy - n.ty) * p + jy) * h];
  });

  // tangled threads fade as their endpoints get defragmented
  ctx.lineWidth = 0.7;
  for (const [a, b] of scene.tangled) {
    const alpha = (1 - (prog[a] + prog[b]) / 2) * 0.28;
    if (alpha < 0.01) continue;
    ctx.strokeStyle = rgba(bg, alpha);
    ctx.beginPath();
    ctx.moveTo(pos[a][0], pos[a][1]);
    ctx.lineTo(pos[b][0], pos[b][1]);
    ctx.stroke();
  }

  // clean structure fades in
  ctx.lineWidth = 1;
  for (const [a, b] of scene.clean) {
    const alpha = Math.min(prog[a], prog[b]) * 0.7;
    if (alpha < 0.01) continue;
    ctx.strokeStyle = rgba(bg, alpha);
    ctx.beginPath();
    ctx.moveTo(pos[a][0], pos[a][1]);
    ctx.lineTo(pos[b][0], pos[b][1]);
    ctx.stroke();
  }
  ctx.setLineDash([3, 4]);
  for (const [a, b] of scene.links) {
    const alpha = Math.min(prog[a], prog[b]) * 0.55;
    if (alpha < 0.01) continue;
    ctx.strokeStyle = rgba(accent, alpha);
    ctx.beginPath();
    ctx.moveTo(pos[a][0], pos[a][1]);
    ctx.lineTo(pos[b][0], pos[b][1]);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // nodes
  for (const n of scene.nodes) {
    const p = prog[n.id];
    const [x, y] = pos[n.id];
    ctx.fillStyle = n.hub && p > 0.5 ? rgba(accent, 0.4 + p * 0.6) : rgba(bg, 0.45 + p * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, n.r * (n.hub ? 0.6 + p * 0.4 : 1), 0, Math.PI * 2);
    ctx.fill();
    if (n.hub && p > 0.35) {
      ctx.strokeStyle = rgba(accent, p * 0.9);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 8 + 2 * p, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // hub labels
  ctx.font = '500 11px "Geist Mono", "JetBrains Mono", ui-monospace, monospace';
  ctx.textAlign = 'center';
  for (const cl of scene.clusters) {
    const p = prog[cl.hub];
    if (p < 0.6) continue;
    const [x, y] = pos[cl.hub];
    ctx.fillStyle = rgba(bg, (p - 0.6) / 0.4);
    ctx.fillText(`${String(cl.label).toUpperCase()} ×${cl.size}`, x, y + 24);
  }

  // the defrag head: dashed vertical line with a tag
  const sx = sweepX(t) * w;
  if (t > 0.001 && t < 0.999) {
    ctx.strokeStyle = rgba(accent, 0.9);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = rgba(accent, 1);
    ctx.fillRect(sx - 1, 0, 2, 14);
    ctx.font = '500 10px "Geist Mono", "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DEFRAG', sx + 6, 11);
  }
}
