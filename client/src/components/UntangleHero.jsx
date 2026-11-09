import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { RotateCcw, ArrowDown } from 'lucide-react';
import { buildScene, drawScene, easeInOut, FALLBACK_LABELS } from '../lib/untangle';

const DURATION = 6500; // ms for the full untangle
const DELAY = 900;

const rgbVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '0 0 0';

/** Light themes get an ink-coloured panel with paper strokes; dark themes keep a dark panel. */
function palette() {
  const paper = rgbVar('--bg-primary-rgb');
  const luminance = paper.split(' ').reduce((s, v, i) => s + Number(v) * [0.2126, 0.7152, 0.0722][i], 0) / 255;
  const light = luminance > 0.5;
  return {
    panel: light ? rgbVar('--text-main-rgb') : rgbVar('--bg-secondary-rgb'),
    bg: light ? paper : rgbVar('--text-main-rgb'),
    accent: rgbVar('--color-accent-rgb'),
  };
}

/** Counts from a → b following progress. */
const lerpInt = (a, b, p) => Math.round(a + (b - a) * p);

const UntangleHero = ({ stats, labels, compact = false, onEnter }) => {
  const canvasRef = useRef(null);
  const panelRef = useRef(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const doneRef = useRef(false);
  const loopRef = useRef(null); // latest frame fn, so the rAF loop can re-schedule itself
  const [t, setT] = useState(0);

  const scene = useMemo(() => {
    // real event names first, padded with generic categories so the picture always has 9 clusters
    const real = [...new Set((labels || []).map((l) => String(l).toUpperCase()))];
    const pad = FALLBACK_LABELS.filter((l) => !real.includes(l));
    return buildScene(7, [...real, ...pad].slice(0, 9));
  }, [labels]);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const frame = useCallback((now) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const raw = Math.max(0, (now - startRef.current - DELAY) / DURATION);
    const tt = reduced ? 1 : Math.min(1, raw);
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pal = palette();
    if (panelRef.current) {
      panelRef.current.style.backgroundColor = `rgb(${pal.panel.replace(/ /g, ',')})`;
      panelRef.current.style.color = `rgb(${pal.bg.replace(/ /g, ',')})`;
    }
    drawScene(ctx, scene, tt, now / 1000, rect.width, rect.height, pal);
    setT((prev) => (Math.abs(prev - tt) > 0.004 ? tt : prev));
    doneRef.current = tt >= 1;
    if (tt < 1) rafRef.current = requestAnimationFrame((n) => loopRef.current(n));
  }, [scene, reduced]);

  useEffect(() => { loopRef.current = frame; }, [frame]);

  const play = useCallback((skipDelay = false) => {
    cancelAnimationFrame(rafRef.current);
    doneRef.current = false;
    startRef.current = performance.now() - (skipDelay ? DELAY : 0);
    rafRef.current = requestAnimationFrame(frame);
  }, [frame]);

  useEffect(() => {
    // compact (returning visitor): already-defragged still frame
    startRef.current = performance.now() - (compact ? DELAY + DURATION : 0);
    rafRef.current = requestAnimationFrame(frame);
    const ro = new ResizeObserver(() => { if (doneRef.current) rafRef.current = requestAnimationFrame(frame); });
    if (panelRef.current) ro.observe(panelRef.current);
    // canvas text needs the webfont: redraw once fonts are ready
    document.fonts?.ready.then(() => { if (doneRef.current) rafRef.current = requestAnimationFrame(frame); });
    const mo = new MutationObserver(() => { if (doneRef.current) rafRef.current = requestAnimationFrame(frame); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); mo.disconnect(); };
  }, [frame, compact]);

  const p = easeInOut(t);
  const phase = t < 0.04 ? ['01', 'FRAGMENTED'] : t < 0.995 ? ['02', `DEFRAGGING ${Math.round(t * 100)}%`] : ['03', 'DEFRAGGED'];
  const before = stats?.articles_24h, after = stats?.events_24h;

  return (
    <section
      className={`grid md:grid-cols-2 border-b border-base-border ${compact ? 'min-h-[300px]' : 'min-h-[calc(100dvh-130px)]'}`}
      aria-label="Defrag intro"
    >
      {/* left: copy */}
      <div className="flex flex-col justify-between px-4 sm:px-8 md:pl-[max(2rem,calc((100vw-64rem)/2+1rem))] py-8 md:py-12 order-2 md:order-1">
        <div className="text-[11px] tracking-[0.18em] text-muted uppercase">
          Tech news hub · 12 sources · <span className="text-accent">{phase[0]} / {phase[1]}</span>
        </div>

        <div className="py-8">
          <h1 className={`font-heading leading-[1.02] grid ${compact ? 'text-4xl' : 'text-5xl lg:text-7xl'}`}>
            {/* both lines share one grid cell; they fade one after the other so they never overlap */}
            <span className="[grid-area:1/1] text-main" style={{ opacity: Math.max(0, 1 - p / 0.4) }}>Tech news is a tangled web.</span>
            <span className="[grid-area:1/1] text-accent" style={{ opacity: Math.max(0, (p - 0.6) / 0.4) }} aria-hidden={p < 0.5}>
              Now it's defragged.
            </span>
          </h1>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
            Five outlets, one story, ten headlines. Defrag reads every source, merges duplicates into events,
            scores each with an explainable formula and links the companies and technologies behind them.
          </p>

          {before && after ? (
            <div className="mt-8 flex items-end gap-3">
              <span className="font-heading text-6xl leading-none tabular-nums text-main">{lerpInt(before, after, p)}</span>
              <span className="pb-1 text-[11px] tracking-[0.15em] text-muted uppercase">
                {p < 0.5 ? 'articles in 24h' : 'events after merge'}
                <span className="ml-2 border border-base-border bg-secondary px-1.5 py-0.5 text-main">{before} → {after}</span>
              </span>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={onEnter} className="flex items-center gap-2 bg-main px-5 py-3 text-xs tracking-widest text-primary uppercase hover:bg-accent transition-colors">
              Enter the feed <ArrowDown size={14} />
            </button>
            <button onClick={() => play(true)} className="flex items-center gap-2 border border-base-border bg-secondary px-5 py-3 text-xs tracking-widest uppercase text-main hover:border-accent hover:text-accent transition-colors">
              <RotateCcw size={13} /> Watch again
            </button>
          </div>
        </div>

        <div className="text-[11px] tracking-[0.18em] text-muted uppercase">Scroll to dive in ↓</div>
      </div>

      {/* right: the web (inverted panel) */}
      <div ref={panelRef} className="relative order-1 md:order-2 min-h-[300px] md:min-h-0">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img"
          aria-label="Animation: a tangled network of news articles is sorted into clean event clusters" />
        <div className="absolute left-3 bottom-3 hidden sm:block text-[10px] tracking-[0.18em] opacity-70 uppercase">
          {t < 0.995 ? 'dots = articles · lines = noise' : 'hubs = events · dashed = shared entities'}
        </div>
      </div>
    </section>
  );
};

export default UntangleHero;
