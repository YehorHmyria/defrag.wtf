/** Reads theme colours (CSS variables) for canvas drawing. All values are "r g b" strings. */
export const rgbVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '0 0 0';

/**
 * Colours for a dark "panel" drawn on the page.
 * Light themes: charcoal panel with paper-coloured strokes. Dark themes: darkest surface with light strokes.
 */
export function palette() {
  const paper = rgbVar('--bg-primary-rgb');
  const luminance = paper.split(' ').reduce((s, v, i) => s + Number(v) * [0.2126, 0.7152, 0.0722][i], 0) / 255;
  const light = luminance > 0.5;
  return {
    paper,
    ink: rgbVar('--text-main-rgb'),
    hot: rgbVar('--color-hot-rgb'),
    muted: rgbVar('--text-muted-rgb'),
    panel: light ? '35 35 35' : rgbVar('--bg-secondary-rgb'),
    onPanel: light ? paper : rgbVar('--text-main-rgb'),
    accent: light ? '214 168 120' : rgbVar('--color-accent-rgb'),
    bg: light ? paper : rgbVar('--text-main-rgb'),
  };
}

export const rgba = (c, a) => `rgba(${c.replace(/ /g, ',')},${a})`;
