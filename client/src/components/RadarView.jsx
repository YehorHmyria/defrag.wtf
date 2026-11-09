import EventCard from './EventCard';
import LoadingState from './LoadingState';
import { Radar } from 'lucide-react';

const RadarView = ({ radar, stack, lang, saved, onSave, onOpenStack, onEntity }) => {
  const { data, loading, error } = radar;

  if (!stack.length) {
    return (
      <div className="text-center py-24 border border-dashed border-base-border">
        <Radar className="mx-auto mb-4 text-accent" size={36} />
        <h2 className="text-3xl font-heading mb-2">STACK RADAR</h2>
        <p className="text-muted max-w-md mx-auto mb-6 text-sm">
          Tell Defrag what you build with. It will flag only the vulnerabilities, deprecations and outages that touch your stack.
        </p>
        <button className="btn-dedsec" onClick={onOpenStack}>Set up my stack</button>
      </div>
    );
  }
  if (loading || !data) return <LoadingState rows={3} />;
  if (error) return <div className="text-hot text-center py-16">Radar offline.</div>;

  const alerts = data.alerts;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6 text-xs text-muted">
        <span className="tracking-widest">WATCHING</span>
        {stack.map((s) => <span key={s} className="chip chip-on">{s}</span>)}
        <button className="chip" onClick={onOpenStack}>edit</button>
      </div>
      {alerts.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-base-border">
          <p className="text-accent text-lg mb-1">All quiet.</p>
          <p className="text-muted text-sm">No security, deprecation or outage events touch your stack in the last 14 days.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((e) => (
            <EventCard key={e.id} event={e} lang={lang} isSaved={saved.some((s) => s.id === e.id)} onSave={onSave} onEntity={onEntity} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RadarView;
