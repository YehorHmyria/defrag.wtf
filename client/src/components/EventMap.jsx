import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { buildScene, drawScene, easeInOut, FALLBACK_LABELS } from '../lib/untangle';
import { palette } from '../lib/theme';
import AsciiBackdrop from './AsciiBackdrop';

const DURATION = 6500; // ms for the full untangle
const DELAY = 700;

/**
 * "Event map": today's top events as hubs, with their articles around them.
 * A defrag head sweeps across and pulls a tangled web of articles into these clusters.
 * Plays once when it scrolls into view; click to replay.
 */
const EventMap = ({ labels, className = '' }) => {
  const panelRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const doneRef = useRef(false);
  const lastT = useRef(0);
  const loopRef = useRef(null);
  const [t, setT] = useState(0);

  const scene = useMemo(() => {
    const real = [...new Set((labels || []).map((l) => String(l).toUpperCase()))];
    const pad = FALLBACK_LABELS.filter((l) => !real.includes(l));
    return buildScene(7, [...real, ...pad].slice(0, 9));
  }, [labels]);

  const paint = useCallback((tt, time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
      panelRef.current.style.color = `rgb(${pal.onPanel.replace(/ /g, ',')})`;
    }
    drawScene(ctx, scene, tt, time, rect.width, rect.height, { bg: pal.onPanel, accent: pal.accent });
  }, [scene]);

  const loop = useCallback((now) => {
    const tt = Math.min(1, Math.max(0, (now - startRef.current - DELAY) / DURATION));
    lastT.current = tt;
    paint(tt, now / 1000);
    setT((prev) => (Math.abs(prev - tt) > 0.004 ? tt : prev));
    if (tt < 1) rafRef.current = requestAnimationFrame((n) => loopRef.current(n));
    else doneRef.current = true;
  }, [paint]);

  useEffect(() => { loopRef.current = loop; }, [loop]);

  const play = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    doneRef.current = false;
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame((n) => loopRef.current(n));
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    paint(reduced ? 1 : 0, 0);
    if (reduced) { doneRef.current = true; lastT.current = 1; }
    let played = false;
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !played && !reduced) { played = true; play(); }
    }, { threshold: 0.35 });
    if (panelRef.current) io.observe(panelRef.current);
    const redraw = () => { if (doneRef.current) paint(1, 0); else if (!rafRef.current) paint(lastT.current, 0); };
    const ro = new ResizeObserver(redraw);
    if (panelRef.current) ro.observe(panelRef.current);
    const mo = new MutationObserver(redraw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    document.fonts?.ready.then(redraw);
    return () => { cancelAnimationFrame(rafRef.current); io.disconnect(); ro.disconnect(); mo.disconnect(); };
  }, [paint, play]);

  return (
    <div ref={panelRef} className={`relative overflow-hidden ${className}`}>
      <AsciiBackdrop opacity={0.07} />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-pointer" onClick={play} role="img"
        aria-label="Animation: a tangled web of articles is pulled into clusters, one hub per event" />
      <div className="absolute left-4 bottom-3 right-14 text-[10px] uppercase opacity-70" style={{ letterSpacing: '0.18em' }}>
        {t < 0.995 ? 'dots = articles · lines = noise' : 'hubs = events · dashed = shared entities'}
      </div>
      <button onClick={play} className="absolute right-3 bottom-2.5 p-1.5 opacity-70 hover:opacity-100" aria-label="Replay animation">
        <RotateCcw size={14} />
      </button>
      <span className="sr-only">{`Progress ${Math.round(easeInOut(t) * 100)}%`}</span>
    </div>
  );
};

export default EventMap;
