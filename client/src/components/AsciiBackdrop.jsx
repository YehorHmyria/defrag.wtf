import { useEffect, useRef } from 'react';

const PHRASES = [
  'SIGNAL OVER NOISE', 'EVENTS NOT ARTICLES', '12 SOURCES', 'EXPLAINABLE SCORE', 'ONE STORY ONE CARD',
  'CVE · RELEASE · OUTAGE', 'STACK RADAR', 'ENTITY GRAPH', 'DEDUPLICATED', 'CITED ANSWERS', 'FACTS ONLY',
];
const SCRAMBLE = 'ABCDEFGHKLMNPRSTUXYZ0123456789#%/<>*+';

/**
 * Faint rows of monospace text that fill a dark section (Content Architecture style).
 * Letters near the pointer wake up and scramble. Colour comes from the parent's `color`.
 */
const AsciiBackdrop = ({ className = '', opacity = 0.1 }) => {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: -999, y: -999 };
    let visible = true;
    let timer = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      const color = getComputedStyle(canvas).color.match(/\d+/g) || [255, 255, 255];
      const fs = 12, cw = 7.4, lh = 19;
      ctx.font = `400 ${fs}px "Geist Mono", "JetBrains Mono", ui-monospace, monospace`;
      ctx.textBaseline = 'middle';
      const cols = Math.ceil(rect.width / cw) + 2;
      const rows = Math.ceil(rect.height / lh);
      for (let r = 0; r < rows; r++) {
        let line = '';
        let k = r * 3;
        while (line.length < cols + 40) line += `${PHRASES[k++ % PHRASES.length]}  ·  `;
        const shift = (r * 17) % 40;
        for (let c = 0; c < cols; c++) {
          const x = c * cw, y = r * lh + lh / 2;
          const d = Math.hypot(x - pointer.x, y - pointer.y);
          const near = d < 110;
          const ch = near && Math.random() < 0.35 ? SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)] : line[c + shift];
          if (ch === ' ') continue;
          const a = near ? Math.min(0.75, opacity + (1 - d / 110) * 0.65) : opacity;
          ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${a})`;
          ctx.fillText(ch, x, y);
        }
      }
    };

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const onLeave = () => { pointer.x = pointer.y = -999; };
    const parent = canvas.parentElement;
    draw();
    if (!reduced) {
      parent?.addEventListener('pointermove', onMove);
      parent?.addEventListener('pointerleave', onLeave);
      timer = window.setInterval(() => { if (visible && !document.hidden) draw(); }, 110);
    }
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; });
    io.observe(canvas);
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => {
      window.clearInterval(timer); io.disconnect(); ro.disconnect();
      parent?.removeEventListener('pointermove', onMove);
      parent?.removeEventListener('pointerleave', onLeave);
    };
  }, [opacity]);

  return <canvas ref={ref} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden="true" />;
};

export default AsciiBackdrop;
