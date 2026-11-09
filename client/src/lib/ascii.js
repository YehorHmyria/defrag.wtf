/**
 * ASCII block wipe (screen-to-screen transition): cells of dark blocks with letters rise from
 * the bottom to cover the screen ("cover"), then recede upward to reveal the next screen ("uncover").
 */
const CHARS = ' .:-=+*#%@ABCDEFGHKLMNPRSTUXYZ0123456789/\\|<>';

function hash(a, b, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function drawAsciiWipe(ctx, w, h, { phase, p, time, block, text }) {
  const cw = 14, ch = 20;
  const cols = Math.ceil(w / cw), rows = Math.ceil(h / ch);
  const tick = Math.floor(time * 14);
  const edge = phase === 'cover' ? p * 1.4 - 0.12 : p * 1.4 - 0.12;
  ctx.clearRect(0, 0, w, h);
  ctx.font = '500 12px "Geist Mono", "JetBrains Mono", ui-monospace, monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  for (let cy = 0; cy < rows; cy++) {
    const yb = 1 - cy / rows; // 0 at bottom .. 1 at top
    for (let cx = 0; cx < cols; cx++) {
      const j = hash(cx, cy) * 0.16;
      // cover: filled where the rising edge has passed. uncover: filled where the receding edge has not yet.
      const d = phase === 'cover' ? edge - (yb + j) : yb + j - edge;
      if (d <= 0) continue;
      const ch1 = CHARS[Math.floor(hash(cx, cy, tick) * CHARS.length)];
      const x = cx * cw + cw / 2, y = cy * ch + ch / 2;
      if (d > 0.1) {
        ctx.fillStyle = `rgb(${block.replace(/ /g, ',')})`;
        ctx.fillRect(cx * cw, cy * ch, cw + 0.5, ch + 0.5);
        if (hash(cx, cy, 99) > 0.55) {
          ctx.fillStyle = `rgba(${text.replace(/ /g, ',')},0.16)`;
          ctx.fillText(ch1, x, y);
        }
      } else if (hash(cx, cy, 7) < d / 0.1) {
        // frontier: some cells are solid blocks with bright letters...
        ctx.fillStyle = `rgb(${block.replace(/ /g, ',')})`;
        ctx.fillRect(cx * cw, cy * ch, cw + 0.5, ch + 0.5);
        ctx.fillStyle = `rgba(${text.replace(/ /g, ',')},0.85)`;
        ctx.fillText(ch1, x, y);
      } else if (hash(cx, cy, 13) > 0.5) {
        // ...others are loose letters drifting in front of the page
        ctx.fillStyle = `rgba(${block.replace(/ /g, ',')},0.45)`;
        ctx.fillText(ch1, x, y);
      }
    }
  }
}
