import { useEffect, useRef } from 'react';
import { buildScribble, drawScribble } from '../lib/scribble';
import { drawAsciiWipe } from '../lib/ascii';
import { easeInOut } from '../lib/untangle';
import { palette } from '../lib/theme';

// seconds
const T = { draw: 0.9, unravelStart: 0.8, unravel: 2.0, word: 2.6, cover: 4.0, coverLen: 0.65, uncoverLen: 0.8 };
const END = T.cover + T.coverLen + T.uncoverLen;
const WORD = 'defrag';
const SCRAMBLE = 'abcdefghklmnprstuxyz0123456789#%/<>';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

/**
 * Full-screen intro. A hand-scribbled tangle of "news" is wound into one clean ring, the word
 * the word "defrag" appears in the middle, then an ASCII wipe hands over to the site.
 */
const Splash = ({ onDone }) => {
  const rootRef = useRef(null);
  const inkRef = useRef(null);
  const wipeRef = useRef(null);
  const wordRef = useRef(null);
  const textRef = useRef(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const skipRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const scribble = buildScribble(11);
    startRef.current = performance.now();

    const fit = (c) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth, h = window.innerHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w, h };
    };

    const frame = (now) => {
      let t = (now - startRef.current) / 1000;
      if (skipRef.current && t < T.cover) { startRef.current = now - T.cover * 1000; t = T.cover; }
      const pal = palette();
      const { ctx, w, h } = fit(inkRef.current);
      const { ctx: wctx } = fit(wipeRef.current);

      const covered = t >= T.cover + T.coverLen;
      ctx.clearRect(0, 0, w, h);
      // everything fades out quickly as the wipe starts, so nothing lingers behind or shows through it
      const fade = 1 - clamp((t - T.cover) / 0.25);
      if (!covered) {
        const R = Math.min(w, h) * (w < 700 ? 0.32 : 0.27);
        const cx = w / 2, cy = h * (w < 700 ? 0.38 : 0.42);
        drawScribble(ctx, scribble, {
          draw: easeInOut(clamp(t / T.draw)),
          morph: easeInOut(clamp((t - T.unravelStart) / T.unravel)),
          time: t, cx, cy, R, color: pal.ink, alpha: 0.92 * fade,
        });

        // the word in the ring: letters resolve out of noise
        const r = clamp((t - T.word) / 0.7);
        if (wordRef.current) {
          wordRef.current.style.top = `${cy}px`;
          wordRef.current.style.opacity = r > 0 ? fade : 0;
          wordRef.current.style.fontSize = `${Math.max(34, R * 0.5)}px`;
          let out = '';
          for (let i = 0; i < WORD.length; i++) {
            out += r * WORD.length > i + 0.5 ? WORD[i] : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
          }
          wordRef.current.textContent = out;
        }
        if (textRef.current) {
          textRef.current.style.top = `${cy + R + 36}px`;
          textRef.current.style.opacity = clamp((t - (T.word + 0.4)) / 0.6) * fade;
        }
      }

      // ASCII wipe: cover, then uncover
      const block = pal.panel, textC = pal.onPanel;
      if (t >= T.cover && t < T.cover + T.coverLen) {
        drawAsciiWipe(wctx, w, h, { phase: 'cover', p: (t - T.cover) / T.coverLen, time: t, block, text: textC });
      } else if (covered) {
        drawAsciiWipe(wctx, w, h, { phase: 'uncover', p: clamp((t - T.cover - T.coverLen) / T.uncoverLen), time: t, block, text: textC });
        if (rootRef.current) rootRef.current.style.backgroundColor = 'transparent';
      } else {
        wctx.clearRect(0, 0, w, h);
      }
      if (covered) {
        if (wordRef.current) wordRef.current.style.opacity = 0;
        if (textRef.current) textRef.current.style.opacity = 0;
      }

      if (t >= END) {
        if (!doneRef.current) { doneRef.current = true; onDone(); }
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    const skip = () => { skipRef.current = true; };
    const onKey = (e) => { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') skip(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('keydown', onKey); };
  }, [onDone]);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] bg-primary cursor-pointer select-none"
      onClick={() => { skipRef.current = true; }}
      role="dialog" aria-label="Defrag intro (press Enter to skip)"
    >
      <canvas ref={inkRef} className="absolute inset-0 h-full w-full" />

      {/* word inside the ring */}
      <div ref={wordRef} className="absolute left-0 right-0 -translate-y-1/2 text-center font-heading font-semibold tracking-tight text-hot opacity-0" aria-hidden="true" />

      {/* title block under the ring */}
      <div ref={textRef} className="absolute left-0 right-0 px-6 text-center opacity-0">
        <div className="text-lg text-main">Tech news, untangled.</div>
        <div className="mt-6 text-[11px] tracking-[0.2em] text-main uppercase">Events · Not articles</div>
      </div>

      <div className="absolute bottom-5 right-5 text-[11px] tracking-[0.2em] text-muted uppercase">Click or press Enter to skip</div>

      <canvas ref={wipeRef} className="pointer-events-none absolute inset-0 h-full w-full" />

    </div>
  );
};

export default Splash;
