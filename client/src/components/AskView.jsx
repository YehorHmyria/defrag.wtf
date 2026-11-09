import { useState } from 'react';
import { Send } from 'lucide-react';
import { askDefrag } from '../lib/api';

const EXAMPLES = ['What happened with Kubernetes recently?', 'Any new CVEs affecting Linux?', 'What did OpenAI release?'];

/** Turns [1], [2] in the answer into anchors to the source list. */
const Answer = ({ text, sources }) => (
  <p className="leading-relaxed whitespace-pre-wrap">
    {text.split(/(\[\d+\])/g).map((part, i) => {
      const m = part.match(/^\[(\d+)\]$/);
      const src = m && sources.find((s) => s.n === Number(m[1]));
      return src ? (
        <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" className="text-accent align-super text-[10px] hover:underline" title={src.title}>[{m[1]}]</a>
      ) : <span key={i}>{part}</span>;
    })}
  </p>
);

const AskView = () => {
  const [q, setQ] = useState('');
  const [state, setState] = useState({ loading: false, result: null, error: null });

  const ask = async (question) => {
    if (question.trim().length < 3) return;
    setState({ loading: true, result: null, error: null });
    try {
      setState({ loading: false, result: await askDefrag(question), error: null });
    } catch (e) {
      setState({ loading: false, result: null, error: e.response?.data?.error || 'Request failed' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-heading mb-1">ASK DEFRAG</h2>
      <p className="text-xs text-muted mb-4">Answers are generated only from articles in the Defrag database and always cite them. No sources means no answer.</p>

      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2 mb-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder="Ask about a technology, company or event…"
          className="flex-1 bg-secondary border border-base-border px-4 py-3 outline-none focus:border-accent" />
        <button className="btn-dedsec flex items-center gap-2" disabled={state.loading}><Send size={14} />Ask</button>
      </form>
      <div className="flex flex-wrap gap-1.5 mb-8">
        {EXAMPLES.map((ex) => <button key={ex} className="chip" onClick={() => { setQ(ex); ask(ex); }}>{ex}</button>)}
      </div>

      {state.loading && <div className="text-accent animate-pulse">{'>'} searching the archive…</div>}
      {state.error && <div className="text-hot">{state.error}</div>}
      {state.result && (
        <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
          <div className="border border-accent/50 p-5"><Answer text={state.result.answer} sources={state.result.sources} /></div>
          {state.result.sources.length > 0 && (
            <ol className="text-xs space-y-1.5">
              <li className="text-[10px] tracking-widest text-muted">SOURCES</li>
              {state.result.sources.map((s) => (
                <li key={s.n}><a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                  <span className="text-accent">[{s.n}]</span> {s.title} <span className="text-muted">· {s.source_name} · {s.published_at.slice(0, 10)}</span>
                </a></li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
};

export default AskView;
