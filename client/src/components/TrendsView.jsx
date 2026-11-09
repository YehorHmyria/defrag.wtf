import LoadingState from './LoadingState';
import { getTrends } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { TYPE_LABELS } from '../lib/format';
import { useState } from 'react';

const Spark = ({ counts, w = 260, h = 36 }) => {
  const max = Math.max(1, ...counts);
  const step = w / (counts.length - 1 || 1);
  const pts = counts.map((c, i) => `${(i * step).toFixed(1)},${(h - 3 - (c / max) * (h - 8)).toFixed(1)}`);
  const last = counts[counts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9" role="img" aria-label={`${counts.join(', ')}`} preserveAspectRatio="none">
      <polyline points={pts.join(' ')} fill="none" stroke="rgb(var(--color-accent-rgb))" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <circle cx={(counts.length - 1) * step} cy={h - 3 - (last / max) * (h - 8)} r="2.5" fill="rgb(var(--color-accent-rgb))" />
    </svg>
  );
};

const TrendsView = ({ onOpenEntity }) => {
  const [days, setDays] = useState(14);
  const { data, loading, error } = useAsync(() => getTrends({ days }), [days]);

  if (loading) return <LoadingState rows={3} />;
  if (error) return <div className="text-hot text-center py-16">Trends unavailable.</div>;

  const typeEntries = Object.entries(data.by_type).sort((a, b) => b[1] - a[1]);
  const maxType = Math.max(1, ...typeEntries.map(([, v]) => v));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-xs text-muted">Events per day mentioning each entity (clusters, not raw articles).</p>
        <div className="flex border border-base-border">
          {[7, 14, 30].map((v) => (
            <button key={v} onClick={() => setDays(v)} aria-pressed={days === v}
              className={`px-3 py-1 text-xs ${days === v ? 'bg-accent text-primary' : 'text-muted hover:text-main'}`}>{v}D</button>
          ))}
        </div>
      </div>

      {data.series.length === 0 ? (
        <div className="text-center py-24 text-muted border border-dashed border-base-border">History is still building up. Trends appear after a few days of ingestion.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <section>
            <h2 className="text-2xl font-heading mb-3">HOTTEST ENTITIES</h2>
            <ul className="divide-y divide-base-border border border-base-border">
              {data.series.map((s) => (
                <li key={s.name} className="grid grid-cols-[110px_1fr_36px] items-center gap-3 px-3 py-2">
                  <button className="text-left truncate hover:text-accent text-sm" onClick={() => onOpenEntity(s.name)} title={s.type}>{s.name}</button>
                  <Spark counts={s.counts} />
                  <span className="text-right font-heading text-xl text-accent">{s.total}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-heading mb-3">WHAT KIND OF NEWS</h2>
            <ul className="space-y-2 border border-base-border p-4">
              {typeEntries.map(([t, v]) => (
                <li key={t} className="grid grid-cols-[100px_1fr_32px] items-center gap-3 text-xs">
                  <span className="text-muted">{TYPE_LABELS[t] || t}</span>
                  <div className="h-2 bg-base-border"><div className="h-full bg-accent" style={{ width: `${(v / maxType) * 100}%` }} /></div>
                  <span className="text-right">{v}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
};

export default TrendsView;
