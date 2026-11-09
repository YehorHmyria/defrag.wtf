import { useState } from 'react';
import { ExternalLink, ChevronDown, Bookmark, BookmarkCheck, ShieldAlert } from 'lucide-react';
import ImpactMeter from './ImpactMeter';
import CredibilityBadge from './CredibilityBadge';
import { timeAgo, gap, bullets, TYPE_LABELS, hotTypes } from '../lib/format';

const BREAKDOWN_LABELS = {
  base: 'Event type base', technical_detail: 'Technical detail', audience: 'Audience size',
  confirmed: 'Official / confirmed', cve: 'CVE referenced', version: 'Version mentioned', hype: 'Hype language',
};

const Breakdown = ({ b }) => (
  <div className="mt-3 border border-dashed border-base-border p-3 text-xs space-y-1 animate-[fadeIn_0.15s_ease-out]">
    <div className="text-muted tracking-widest mb-1">WHY {b.total}? ({b.type})</div>
    {Object.entries(BREAKDOWN_LABELS).map(([k, label]) =>
      b[k] ? (
        <div key={k} className="flex justify-between">
          <span className="text-muted">{label}</span>
          <span className={b[k] > 0 ? 'text-accent' : 'text-hot'}>{k === 'base' ? b[k] : b[k] > 0 ? `+${b[k]}` : b[k]}</span>
        </div>
      ) : null
    )}
  </div>
);

const EventCard = ({ event, lang = 'en', isHero = false, isSaved, onSave, onEntity, onTag }) => {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState(false);
  const useUk = lang === 'uk' && event.title_uk;
  const title = useUk ? event.title_uk : event.title;
  const summary = bullets(lang === 'uk' && event.summary_uk ? event.summary_uk : event.summary);
  const first = event.articles[0];
  const multi = event.article_count > 1;
  const hot = hotTypes.has(event.event_type);

  return (
    <article className={`card-dedsec flex gap-4 ${isHero ? 'border-accent/50' : ''}`}>
      <div className="hidden sm:block pt-1"><ImpactMeter score={event.max_impact} /></div>

      <div className="min-w-0 flex-1">
        {/* meta row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted mb-2">
          <span className="sm:hidden font-heading text-xl text-accent leading-none">{event.max_impact}</span>
          {event.event_type && (
            <span className={`chip ${hot ? 'border-hot/60 text-hot' : ''}`}>
              {hot && <ShieldAlert size={11} />}
              {TYPE_LABELS[event.event_type] || event.event_type}
            </span>
          )}
          <button className="chip" onClick={() => onTag?.(event.short_tag)} title="Filter by tag">#{event.short_tag}</button>
          <CredibilityBadge credibility={event.credibility} />
          {event.articles.some((a) => a.meta?.mock) && <span className="chip border-dashed" title="Demo data, not real news">DEMO</span>}
          <span>{timeAgo(event.first_seen)}</span>
          {event.cve_ids?.slice(0, 2).map((c) => (
            <a key={c} className="chip border-hot/60 text-hot" href={`https://nvd.nist.gov/vuln/detail/${c}`} target="_blank" rel="noopener noreferrer">{c}</a>
          ))}
        </div>

        {/* title */}
        <h3 className={`font-heading leading-[1.1] text-main mb-3 ${isHero ? 'text-4xl md:text-5xl' : 'text-2xl'}`}>
          <a href={first.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">{title}</a>
        </h3>

        {/* facts */}
        <ul className={`space-y-1.5 text-main/80 ${isHero ? 'text-base' : 'text-sm'}`}>
          {summary.map((p, i) => (
            <li key={i} className="flex gap-2"><span className="text-accent/70 select-none">›</span><span>{p}</span></li>
          ))}
        </ul>

        {/* entities + matched stack */}
        {(event.entities.length > 0 || event.matched?.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {event.matched?.map((m) => (
              <span key={m} className="chip chip-on" title="In your stack">★ {m}</span>
            ))}
            {event.entities.filter((e) => !event.matched?.includes(e.toLowerCase())).map((e) => (
              <button key={e} className="chip" onClick={() => onEntity?.(e)} title="Filter by entity">{e}</button>
            ))}
          </div>
        )}

        {why && event.score_breakdown && <Breakdown b={event.score_breakdown} />}

        {/* coverage timeline */}
        {open && (
          <ol className="mt-4 border-l border-base-border pl-4 space-y-2 text-xs animate-[fadeIn_0.15s_ease-out]">
            {event.articles.map((a, i) => (
              <li key={a.id} className="relative">
                <span className={`absolute -left-[21px] top-1 h-2 w-2 rounded-full ${i === 0 ? 'bg-accent' : 'bg-base-border'}`} />
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                  <span className="text-main">{a.source_name}</span>
                  <span className="text-muted"> · {gap(first.published_at, a.published_at)} · {a.title}</span>
                </a>
                {a.meta?.hn_points && (
                  <a href={a.meta.discussion} target="_blank" rel="noopener noreferrer" className="ml-2 text-accent-secondary">
                    ▲{a.meta.hn_points} · {a.meta.hn_comments} comments
                  </a>
                )}
              </li>
            ))}
          </ol>
        )}

        {/* footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-muted">
            <button onClick={() => setOpen(!open)} className="flex items-center gap-1 hover:text-accent" aria-expanded={open}>
              <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              {multi ? `${event.article_count} sources · timeline` : first.source_name}
            </button>
            {event.score_breakdown && (
              <button onClick={() => setWhy(!why)} className="hover:text-accent" aria-expanded={why}>why this score?</button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => onSave?.(event)} className={`flex items-center gap-1 ${isSaved ? 'text-accent' : 'text-muted hover:text-accent'}`} aria-pressed={isSaved}>
              {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}{isSaved ? 'saved' : 'save'}
            </button>
            <a href={first.url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-accent" aria-label="Open source"><ExternalLink size={14} /></a>
          </div>
        </div>
      </div>
    </article>
  );
};

export default EventCard;
