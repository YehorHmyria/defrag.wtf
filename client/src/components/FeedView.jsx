import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import EventCard from './EventCard';
import TicketCard from './TicketCard';
import AsciiBackdrop from './AsciiBackdrop';
import LoadingState from './LoadingState';
import { getEvents } from '../lib/api';
import { TYPE_LABELS } from '../lib/format';

const Seg = ({ value, onChange, options }) => (
  <div className="flex border border-base-border" role="group">
    {options.map(([v, label]) => (
      <button key={v} onClick={() => onChange(v)} aria-pressed={value === v}
        className={`px-3 py-1 text-xs tracking-wider transition-colors ${value === v ? 'bg-accent text-primary' : 'text-muted hover:text-main'}`}>
        {label}
      </button>
    ))}
  </div>
);

const TYPES = ['SECURITY', 'RELEASE', 'OUTAGE', 'DEPRECATION', 'ACQUISITION', 'RESEARCH'];

const FeedView = ({ stack, lang, saved, onSave, entity, setEntity }) => {
  const [type, setType] = useState('signal');
  const [days, setDays] = useState(2);
  const [sort, setSort] = useState(stack.length ? 'relevance' : 'impact');
  const [eventType, setEventType] = useState(null);
  const [tag, setTag] = useState(null);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState(null);

  const stackKey = stack.join(',');

  const load = useCallback(async (p) => {
    p === 1 ? setLoading(true) : setMoreLoading(true);
    setError(null);
    try {
      const res = await getEvents({ type, days, sort, stack, page: p, limit: 20, event_type: eventType || undefined, tag: tag || undefined });
      setTotal(res.total);
      setEvents((prev) => (p === 1 ? res.events : [...prev, ...res.events]));
      setPage(p);
    } catch {
      setError('Backend unreachable. Check the server and Supabase connection.');
    } finally {
      setLoading(false);
      setMoreLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, days, sort, stackKey, eventType, tag]);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => { setSort(stack.length ? 'relevance' : 'impact'); }, [stack.length]);

  const shown = entity ? events.filter((e) => e.entities.some((x) => x.toLowerCase() === entity.toLowerCase())) : events;
  const hero = type === 'signal' && !entity && !tag && !eventType && sort === 'impact' ? shown[0] : null;
  const rest = hero ? shown.slice(1) : shown;
  const isSaved = (e) => saved.some((s) => s.id === e.id);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Seg value={type} onChange={setType} options={[['signal', 'SIGNAL'], ['all', 'ALL'], ['trash', 'NOISE']]} />
        <Seg value={days} onChange={setDays} options={[[1, '24H'], [2, '48H'], [7, '7D']]} />
        <label className="flex items-center gap-2 text-xs text-muted">
          SORT
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-primary border border-base-border text-main px-2 py-1 text-xs">
            <option value="impact">Impact</option>
            <option value="recent">Newest</option>
            <option value="coverage">Most covered</option>
            <option value="relevance">My stack</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-6">
        {TYPES.map((t) => (
          <button key={t} className={`chip ${eventType === t ? 'chip-on' : ''}`} onClick={() => setEventType(eventType === t ? null : t)}>
            {TYPE_LABELS[t]}
          </button>
        ))}
        {[['entity', entity, () => setEntity(null)], ['tag', tag && `#${tag}`, () => setTag(null)]].map(([k, v, clear]) =>
          v ? (
            <button key={k} className="chip chip-on" onClick={clear}>{v} <X size={11} /></button>
          ) : null
        )}
        <span className="ml-auto text-[11px] text-muted">{shown.length} / {total} events</span>
      </div>

      {loading ? <LoadingState /> : error ? (
        <div className="border border-hot/50 bg-hot/10 p-8 text-center">
          <p className="text-hot mb-4">{error}</p>
          <button className="btn-dedsec" onClick={() => load(1)}>Retry</button>
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-24 text-muted border border-dashed border-base-border">
          No events match. Try the ALL filter or a wider time range.
        </div>
      ) : (
        <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
          {hero && (
            <section className="band-dark relative left-1/2 w-screen -translate-x-1/2 overflow-hidden py-14 sm:py-20 !my-10">
              <AsciiBackdrop />
              <div className="relative mx-auto max-w-6xl px-4">
                <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <h2 className="font-heading text-4xl sm:text-5xl text-main">Top signal</h2>
                  <p className="max-w-md text-[15px] leading-snug text-muted">
                    The highest-impact event of the last {days === 1 ? '24 hours' : `${days} days`}, merged from every source that covered it.
                  </p>
                </div>
                <TicketCard event={hero} lang={lang} isSaved={isSaved(hero)} onSave={onSave} onEntity={setEntity} />
              </div>
            </section>
          )}
          {rest.map((e) => (
            <EventCard key={e.id} event={e} lang={lang} isSaved={isSaved(e)} onSave={onSave} onEntity={setEntity} onTag={setTag} />
          ))}
          {events.length < total && (
            <div className="text-center pt-2">
              <button className="btn-dedsec" disabled={moreLoading} onClick={() => load(page + 1)}>
                {moreLoading ? 'Loading…' : `Load more (${total - events.length})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedView;
