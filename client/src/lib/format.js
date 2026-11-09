export function timeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function gap(fromIso, toIso) {
  const m = Math.round((new Date(toIso) - new Date(fromIso)) / 60000);
  if (m < 1) return 'first';
  if (m < 60) return `+${m}m`;
  if (m < 1440) return `+${Math.round(m / 60)}h`;
  return `+${Math.round(m / 1440)}d`;
}

export const TYPE_LABELS = {
  SECURITY: 'Security', OUTAGE: 'Outage', RELEASE: 'Release', DEPRECATION: 'Deprecation',
  ACQUISITION: 'M&A', RESEARCH: 'Research', POLICY: 'Policy', PRODUCT: 'Product',
  FUNDING: 'Funding', RUMOR: 'Rumor', TUTORIAL: 'Tutorial', OPINION: 'Opinion', OTHER: 'Other',
};

export const hotTypes = new Set(['SECURITY', 'OUTAGE', 'DEPRECATION']);

export const bullets = (text) =>
  (text || '').split('\n').map((l) => l.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean);

/** Old saved items were flat articles; wrap them into the event shape. */
export function normalizeSaved(item) {
  if (item.articles) return item;
  return {
    id: item.event_id || item.id || item.original_url,
    title: item.title, summary: item.summary, short_tag: item.short_tag,
    max_impact: item.impact_score, event_type: item.event_type, entities: [], stack_tags: [],
    cve_ids: [], first_seen: item.published_at, last_seen: item.published_at, article_count: 1,
    credibility: null, matched: [], relevance: 0,
    articles: [{ id: item.id, title: item.title, source_name: item.source_name, url: item.original_url, published_at: item.published_at }],
  };
}

/** Turn package.json / requirements.txt / plain text into stack tokens. */
export function parseStackFile(text) {
  const tokens = new Set();
  try {
    const pkg = JSON.parse(text);
    Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).forEach((n) => {
      tokens.add(n.replace(/^@[^/]+\//, '').toLowerCase());
    });
    if (tokens.size) return [...tokens];
  } catch { /* not JSON */ }
  text.split(/[\n,]+/).forEach((line) => {
    const name = line.trim().toLowerCase().split(/[=<>~!\s[;#]/)[0];
    if (name && /^[a-z0-9._+#-]{2,40}$/.test(name)) tokens.add(name);
  });
  return [...tokens];
}
