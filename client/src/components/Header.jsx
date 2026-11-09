import { Search, Layers } from 'lucide-react';
import logo from '../assets/defrag-logo.png';
import ThemeToggle from './ThemeToggle';

const TABS = [
  { id: 'feed', label: 'FEED' },
  { id: 'radar', label: 'RADAR' },
  { id: 'graph', label: 'GRAPH' },
  { id: 'trends', label: 'TRENDS' },
  { id: 'ask', label: 'ASK' },
  { id: 'saved', label: 'SAVED' },
];

const Header = ({ tab, setTab, onOpenSearch, onOpenStack, stackCount, lang, setLang, savedCount, radarCount }) => (
  <header className="sticky top-0 z-40 bg-primary/90 backdrop-blur border-b border-base-border">
   <div className="container mx-auto px-4 max-w-5xl">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <button onClick={() => setTab('feed')} className="flex items-center gap-3 hover-glitch" aria-label="Defrag home">
        <img src={logo} alt="" className="w-9 h-9 object-contain invert-[.15] dark:invert-0" />
        <span className="text-2xl sm:text-3xl font-heading text-main select-none leading-none">
          DeFrag<span className="text-accent">.wtf</span><span className="text-accent animate-blink">_</span>
        </span>
      </button>

      <div className="flex items-center gap-2 sm:gap-3 text-xs whitespace-nowrap">
        <button onClick={() => setLang(lang === 'en' ? 'uk' : 'en')} className="chip" title="Summary language">
          {lang === 'en' ? 'EN' : 'UA'}
        </button>
        <ThemeToggle />
        <button onClick={onOpenStack} className={`chip ${stackCount ? 'chip-on' : ''}`}>
          <Layers size={12} /> <span className="hidden sm:inline">MY </span>STACK{stackCount ? ` · ${stackCount}` : ''}
        </button>
        <button onClick={onOpenSearch} className="chip" aria-label="Search (Ctrl+K)">
          <Search size={12} /><span className="hidden md:inline">SEARCH</span>
          <kbd className="hidden md:inline text-[10px] text-muted ml-1">⌘K</kbd>
        </button>
      </div>
    </div>

    <nav className="scroll-x flex gap-1 -mb-px" aria-label="Sections">
      {TABS.map((t) => {
        const count = t.id === 'saved' ? savedCount : t.id === 'radar' ? radarCount : 0;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`px-4 py-2 text-sm tracking-widest border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-main'
            }`}
          >
            {t.label}
            {count > 0 && (
              <span className={`ml-1.5 text-[10px] px-1 ${t.id === 'radar' ? 'bg-hot text-white' : 'bg-base-border text-main'}`}>{count}</span>
            )}
          </button>
        );
      })}
    </nav>
   </div>
  </header>
);

export default Header;
