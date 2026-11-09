import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { RotateCcw, ArrowDown } from 'lucide-react';
import { buildScribble, drawScribble } from '../lib/scribble';
import { easeInOut } from '../lib/untangle';
import { palette } from '../lib/theme';
import AsciiBackdrop from './AsciiBackdrop';

const WORD = 'defrag';
const SCRAMBLE = 'abcdefghklmnprstuxyz0123456789#%/<>';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerpInt = (a, b, p) => Math.round(a + (b - a) * p);

/**
 * Home hero: the intro composition (scribble -> ring with "defrag") as a still, with extra background:
 * faint ASCII rows, a dot grid and two stray tangles the ring was wound from. "Watch again" replays it.
 */
const Hero = ({ stats, onEnter }) => {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const ringRef = useRef(null);
  const wordRef = useRef(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const loopRef = useRef(null);
  const doneRef = useRef(true);
  const [p, setP] = useState(1); // morph progress, only used for the counter

  const main = useMemo(() => buildScribble(11), []);
  const strayA = useMemo(() => buildScribble(23, 1800), []);
  const strayB = useMemo(() => buildScribble(41, 1800), []);

  const paint = useCallback((draw, morph, time, wordReveal) => {
    const canvas = canvasRef.current, ring = ringRef.current, wrap = wrapRef.current;
    if (!canvas || !ring || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    const pal = palette();
    const rr = ring.getBoundingClientRect();
    const cx = rr.left - rect.left + rr.width / 2, cy = rr.top - rect.top + rr.height / 2;
    const R = rr.width * 0.47;

    // background strays: the tangles the ring was wound from (very faint, static)
    const big = Math.min(rect.width, rect.height) * 0.55;
    drawScribble(ctx, strayA, { draw: 1, morph: 0, time: 0, cx: rect.width * 0.08, cy: rect.height * 0.3, R: big, color: pal.ink, alpha: 0.09 });
    drawScribble(ctx, strayB, { draw: 1, morph: 0, time: 0, cx: rect.width * 0.95, cy: rect.height * 0.72, R: big * 0.9, color: pal.ink, alpha: 0.09 });

    drawScribble(ctx, main, { draw, morph, time, cx, cy, R, color: pal.ink });

    if (wordRef.current) {
      const out = [...WORD].map((ch, i) => (wordReveal * WORD.length > i + 0.5 ? ch : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)])).join('');
      wordRef.current.textContent = out;
      wordRef.current.style.opacity = wordReveal > 0 ? 1 : 0;
    }
  }, [main, strayA, strayB]);

  const loop = useCallback((now) => {
    const t = (now - startRef.current) / 1000;
    const morph = easeInOut(clamp((t - 0.8) / 2.0));
    paint(easeInOut(clamp(t / 0.9)), morph, t, clamp((t - 2.6) / 0.7));
    setP((prev) => (Math.abs(prev - morph) > 0.01 ? morph : prev));
    if (t < 3.4) rafRef.current = requestAnimationFrame((n) => loopRef.current(n));
    else { doneRef.current = true; paint(1, 1, 0, 1); setP(1); }
  }, [paint]);

  useEffect(() => { loopRef.current = loop; }, [loop]);

  const play = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    doneRef.current = false;
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame((n) => loopRef.current(n));
  }, []);

  // static final frame; redraw when layout, theme or fonts change
  useEffect(() => {
    const still = () => { if (doneRef.current) paint(1, 1, 0, 1); };
    still();
    const ro = new ResizeObserver(still);
    if (wrapRef.current) ro.observe(wrapRef.current);
    const mo = new MutationObserver(still);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    document.fonts?.ready.then(still);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); mo.disconnect(); };
  }, [paint]);

  const before = stats?.articles_24h, after = stats?.events_24h;

  return (
    <section
      ref={wrapRef}
      className="relative overflow-hidden border-b border-base-border"
      style={{ backgroundImage: 'radial-gradient(rgb(var(--text-main-rgb) / 0.13) 1px, transparent 1px)', backgroundSize: '26px 26px' }}
      aria-label="Defrag"
    >
      <AsciiBackdrop opacity={0.045} className="text-main" />
      {/* soft paper glow (under the thread canvas) mutes the ASCII rows behind the centre column */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true"
        style={{ background: 'radial-gradient(ellipse 36% 62% at 50% 50%, rgb(var(--bg-primary-rgb) / 0.94) 35%, transparent 100%)' }} />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pt-10 pb-14 text-center">
        <div className="mb-6 text-[11px] uppercase text-muted" style={{ letterSpacing: '0.18em' }}>
          Tech news hub · 12 sources · synced {stats?.last_ingest ? 'live' : 'daily'}
        </div>

        {/* the ring: the thread is drawn into this box by the canvas */}
        <div ref={ringRef} className="relative flex h-[min(58vw,290px)] w-[min(58vw,290px)] items-center justify-center">
          <h1 ref={wordRef} className="font-heading font-semibold tracking-tight text-hot" style={{ fontSize: 'min(14vw, 70px)' }}>defrag</h1>
        </div>

        <p className="mt-6 text-lg text-main">Tech news, untangled.</p>

        <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted">
          Five outlets, one story, ten headlines. Defrag reads every source, merges duplicates into events,
          scores each one with an explainable formula and links the companies and technologies behind them.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
        {before && after ? (
          <div className="flex items-end gap-3">
            <span className="font-heading text-5xl leading-none tabular-nums text-main">{lerpInt(before, after, p)}</span>
            <span className="pb-1 text-[11px] uppercase text-muted" style={{ letterSpacing: '0.15em' }}>
              {p < 0.5 ? 'articles in 24h' : 'events after merge'}
              <span className="ml-2 border border-base-border bg-secondary px-1.5 py-0.5 text-main">{before} → {after}</span>
            </span>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={onEnter} className="flex items-center gap-2 bg-[#232323] px-5 py-3 text-xs uppercase text-white transition-colors hover:bg-[#3a3835]" style={{ letterSpacing: '0.34px' }}>
            Enter the feed <ArrowDown size={14} />
          </button>
          <button onClick={play} className="flex items-center gap-2 border border-base-border bg-secondary px-5 py-3 text-xs uppercase text-main transition-colors hover:border-accent hover:text-accent" style={{ letterSpacing: '0.34px' }}>
            <RotateCcw size={13} /> Watch again
          </button>
        </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
