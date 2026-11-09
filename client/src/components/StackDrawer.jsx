import { useState, useRef, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { parseStackFile } from '../lib/format';

const PRESETS = {
  'Frontend': ['react', 'typescript', 'vite', 'tailwindcss', 'nextjs'],
  'Backend JS': ['nodejs', 'express', 'postgresql', 'redis', 'docker'],
  'Python/ML': ['python', 'pytorch', 'fastapi', 'postgresql', 'kubernetes'],
  'Cloud/DevOps': ['aws', 'kubernetes', 'terraform', 'docker', 'linux'],
};

const StackDrawer = ({ isOpen, onClose, stack, setStack }) => {
  const [text, setText] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const add = (items) => setStack([...new Set([...stack, ...items.map((s) => s.trim().toLowerCase()).filter(Boolean)])].slice(0, 60));
  const remove = (s) => setStack(stack.filter((x) => x !== s));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (file) add(parseStackFile(await file.text()));
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="My stack">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-primary border-l border-accent p-6 overflow-y-auto animate-[fadeIn_0.15s_ease-out]">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-3xl font-heading">MY STACK</h2>
          <button onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <p className="text-xs text-muted mb-6">
          Your technologies personalise the feed ranking and power the <span className="text-accent">RADAR</span> alerts
          (CVEs, deprecations, outages). Stored only in this browser.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); add(text.split(',')); setText(''); }} className="flex gap-2 mb-4">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="react, postgresql, aws…"
            className="flex-1 bg-secondary border border-base-border px-3 py-2 text-sm outline-none focus:border-accent" />
          <button className="btn-dedsec" type="submit">Add</button>
        </form>

        <div className="flex flex-wrap gap-1.5 mb-6 min-h-[2rem]">
          {stack.length === 0 && <span className="text-xs text-muted">Nothing yet.</span>}
          {stack.map((s) => (
            <button key={s} className="chip chip-on" onClick={() => remove(s)} title="Remove">{s} <X size={11} /></button>
          ))}
        </div>

        <div className="text-[10px] tracking-widest text-muted mb-2">PRESETS</div>
        <div className="flex flex-wrap gap-1.5 mb-6">
          {Object.entries(PRESETS).map(([name, items]) => (
            <button key={name} className="chip" onClick={() => add(items)}>+ {name}</button>
          ))}
        </div>

        <div className="text-[10px] tracking-widest text-muted mb-2">IMPORT</div>
        <button className="btn-dedsec flex items-center gap-2" onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> package.json / requirements.txt
        </button>
        <input ref={fileRef} type="file" accept=".json,.txt,text/plain,application/json" className="hidden" onChange={onFile} />
        <p className="text-[11px] text-muted mt-2">The file is parsed locally in your browser, never uploaded.</p>

        {stack.length > 0 && (
          <button className="mt-8 text-xs text-hot hover:underline" onClick={() => setStack([])}>Clear all</button>
        )}
      </aside>
    </div>
  );
};

export default StackDrawer;
