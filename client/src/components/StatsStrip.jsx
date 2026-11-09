import Ledger from './Ledger';
import { timeAgo } from '../lib/format';

const Cell = ({ label, value, hot }) => (
  <div className="px-4 py-3 border-r border-dashed border-base-border last:border-r-0 max-sm:[&:nth-child(2n)]:border-r-0">
    <div className={`font-heading text-4xl leading-none tabular-nums ${hot ? 'text-accent' : 'text-main'}`}>{value ?? '–'}</div>
    <div className="mt-2 text-[10px] tracking-[0.18em] text-muted uppercase">{label}</div>
  </div>
);

const StatsStrip = ({ stats: s }) => (
  <Ledger className="mb-8" >
    <div className="flex justify-between border-b border-dashed border-base-border px-4 py-2 text-[10px] tracking-[0.18em] text-muted uppercase">
      <span>Ledger · last 24h</span>
      <span>{s?.running ? 'syncing…' : s?.last_ingest ? `synced ${timeAgo(s.last_ingest)}` : ''}</span>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4">
      <Cell label="Events" value={s?.events_24h} />
      <Cell label="High signal" value={s?.signal_24h} hot />
      <Cell label="Duplicates merged" value={s ? s.articles_24h - s.events_24h : null} />
      <Cell label="Sources live" value={s ? `${s.sources_active}/${s.sources_total}` : null} />
    </div>
  </Ledger>
);

export default StatsStrip;
