/**
 * One continuous thread that starts as a hand-scribbled tangle and is coiled into a clean ring
 * (the "scribble -> ring" image of an Essentialism-style cover).
 *
 *   buildScribble(seed)         -> { chaos[], order[] }   both normalised to a unit circle
 *   drawScribble(ctx, sc, o)    -> draws the thread
 *
 * The morph runs as a wave along the thread: the start of the string is already coiled
 * while its tail is still tangled, so it looks like the thread is being wound up.
 */
import { rng } from './untangle';

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (x) => { const c = clamp(x); return c * c * (3 - 2 * c); };

export function buildScribble(seed = 11, N = 2600) {
  const rand = rng(seed);

  // --- chaos: heading-integrated random curve with a soft container => loopy scribble
  const waves = Array.from({ length: 4 }, () => ({ a: 0.4 + rand() * 0.9, f: 1.5 + rand() * 6, ph: rand() * TAU }));
  let x = 0, y = 0, th = rand() * TAU;
  const chaos = [];
  const LIMIT = 17;
  for (let i = 0; i < N; i++) {
    const s = i / N;
    let k = 0;
    for (const w of waves) k += w.a * Math.sin(w.f * TAU * s * 1.7 + w.ph);
    th += k * 0.13 + (rand() - 0.5) * 0.3; // + hand tremor
    const r = Math.hypot(x, y);
    if (r > LIMIT) {
      const toCenter = Math.atan2(-y, -x);
      let d = toCenter - th;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      th += d * Math.min(0.35, (r - LIMIT) * 0.06);
    }
    x += Math.cos(th);
    y += Math.sin(th);
    chaos.push([x, y]);
  }
  const cx = chaos.reduce((a, p) => a + p[0], 0) / N;
  const cy = chaos.reduce((a, p) => a + p[1], 0) / N;
  let maxR = 0;
  chaos.forEach((p) => { p[0] -= cx; p[1] -= cy; maxR = Math.max(maxR, Math.hypot(p[0], p[1])); });
  chaos.forEach((p) => { p[0] /= maxR; p[1] /= maxR; });

  // --- order: ~7 slightly irregular concentric loops, like a pen retracing a ring
  const LOOPS = 8;
  const order = [];
  for (let i = 0; i < N; i++) {
    const s = i / N;
    const th2 = TAU * LOOPS * s + 0.6;
    const wob = 1 + 0.05 * Math.sin(2 * th2 + 1.3) + 0.03 * Math.sin(3 * th2 + 0.4) + 0.045 * Math.sin(TAU * LOOPS * s * 0.37);
    const r = 0.94 * wob;
    const ox = 0.035 * Math.sin(TAU * LOOPS * s * 0.5);
    const oy = 0.035 * Math.cos(TAU * LOOPS * s * 0.43);
    order.push([Math.cos(th2) * r + ox, Math.sin(th2) * r * 0.97 + oy]);
  }
  return { chaos, order, N };
}

/**
 * o = { draw: 0..1 (how much of the thread has been drawn), morph: 0..1 (tangle -> ring),
 *       time: seconds, cx, cy, R, color: "r g b", alpha }
 */
export function drawScribble(ctx, sc, o) {
  const { chaos, order, N } = sc;
  const upto = Math.floor(N * clamp(o.draw));
  const W = 0.55; // width of the winding wave along the thread
  const pts = new Array(upto);
  for (let i = 0; i < upto; i++) {
    const s = i / N;
    // m = 1 for points the winding wave has already passed, 0 for those it has not reached
    const m = smooth(clamp(o.morph * (1 + W) - s * W));
    const wob = (1 - m) * 0.012;
    const jx = Math.sin(o.time * 1.6 + i * 0.07) * wob;
    const jy = Math.cos(o.time * 1.3 + i * 0.05) * wob;
    const a = chaos[i], b = order[i];
    pts[i] = [o.cx + (a[0] + (b[0] - a[0]) * m + jx) * o.R, o.cy + (a[1] + (b[1] - a[1]) * m + jy) * o.R];
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const CH = 24;
  for (let i = 0; i + 1 < upto; i += CH) {
    ctx.beginPath();
    ctx.moveTo(pts[i][0], pts[i][1]);
    const end = Math.min(upto - 1, i + CH);
    for (let j = i + 1; j <= end; j++) ctx.lineTo(pts[j][0], pts[j][1]);
    // slight pen-pressure variation along the thread
    ctx.lineWidth = 1.7 + 1.1 * Math.abs(Math.sin(i * 0.013 + 1.1));
    ctx.strokeStyle = `rgba(${o.color.replace(/ /g, ',')},${o.alpha ?? 0.92})`;
    ctx.stroke();
  }
}
