import { ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react';
import CredibilityBadge from './CredibilityBadge';
import { timeAgo, bullets, TYPE_LABELS } from '../lib/format';

/** "Ticket" card for the top event: notches + dashed divider (Knowledge Hub card). Sits on a dark band. */
const TicketCard = ({ event, index = 1, lang, isSaved, onSave, onEntity }) => {
  const useUk = lang === 'uk' && event.title_uk;
  const title = useUk ? event.title_uk : event.title;
  const summary = bullets(lang === 'uk' && event.summary_uk ? event.summary_uk : event.summary);
  const first = event.articles[0];

  return (
    <article className="paper-card relative grid md:grid-cols-[1.15fr_1fr] rounded-[14px] overflow-visible">
      {/* left: label row + headline */}
      <div className="flex min-h-[260px] flex-col justify-between gap-10 p-6 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] uppercase text-muted" style={{ letterSpacing: '0.34px' }}>
          <span>Event {String(index).padStart(3, '0')}</span>
          <span>{timeAgo(event.first_seen)} · {event.article_count} source{event.article_count > 1 ? 's' : ''}</span>
        </div>
        <h3 className="font-heading text-3xl sm:text-4xl lg:text-5xl leading-[1.05] text-main">
          <a href={first.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">{title}</a>
        </h3>
      </div>

      {/* right: summary + actions, separated by a dashed line with notches */}
      <div className="relative flex flex-col justify-between gap-8 border-t border-dashed border-base-border md:border-t-0 md:border-l p-6 sm:p-9">
        <span className="hidden md:block absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#232323]" aria-hidden="true" />
        <span className="hidden md:block absolute -left-3 -bottom-3 h-6 w-6 rounded-full bg-[#232323]" aria-hidden="true" />
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {event.event_type && <span className="chip">{TYPE_LABELS[event.event_type] || event.event_type}</span>}
            <CredibilityBadge credibility={event.credibility} />
            {event.entities.slice(0, 3).map((e) => (
              <button key={e} className="chip" onClick={() => onEntity?.(e)}>{e}</button>
            ))}
          </div>
          <ul className="space-y-2 text-[15px] leading-snug text-muted">
            {summary.map((p, i) => <li key={i} className="flex gap-2"><span className="text-accent">›</span><span>{p}</span></li>)}
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={first.url} target="_blank" rel="noopener noreferrer" className="btn-ink">Read <ExternalLink size={12} /></a>
          <button onClick={() => onSave?.(event)} className="btn-ink" aria-pressed={isSaved}>
            {isSaved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}{isSaved ? 'Saved' : 'Save'}
          </button>
          <span className="ml-auto text-[11px] uppercase text-muted" style={{ letterSpacing: '0.34px' }}>
            {[...new Set(event.articles.map((a) => a.source_name))].slice(0, 3).join(' · ')}
          </span>
        </div>
      </div>
    </article>
  );
};

export default TicketCard;
