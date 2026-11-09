import { Search, Layers } from 'lucide-react';
import LogoMark from './LogoMark';
import ThemeToggle from './ThemeToggle';

const TABS = [
  { id: 'feed', label: 'FEED' },
  { id: 'radar', label: 'RADAR' },
  { id: 'graph', label: 'GRAPH' },
  { id: 'trends', label: 'TRENDS' },
  { id: 'ask', label: 'ASK' },
  { id: 'saved', label: 'SAVED' },
];

const SHOW_TICKER = false; // scrolling status line inside the pill: switched off, code kept

/** Scrolling status line inside the pill (text is duplicated for a seamless loop). */
const Ticker = ({ text }) => (
  <div className="overflow-hidden rounded-[3px] bg-[#dedede] text-[#232323]" aria-label={text}>
    <div className="flex w-max animate-ticker whitespace-nowrap py-[3px] text-[12px] uppercase" style={{ letterSpacing: '0.34px' }} aria-hidden="true">
      {[0, 1].map((i) => <span key={i} className="px-4">{`${text}   ·   `.repeat(6)}</span>)}
    </div>
  </div>
);

const Header = ({ tab, setTab, onOpenSearch, onOpenStack, stackCount, lang, setLang, savedCount, radarCount, ticker }) => (
  <header className="sticky top-0 z-40 pointer-events-none">
    <div className="container mx-auto max-w-6xl px-4 pt-3 flex flex-wrap items-start gap-x-4 gap-y-3">
      {/* wordmark */}
      <button onClick={() => setTab('feed')} className="pointer-events-auto order-1 lg:flex-1 flex items-center justify-start hover-glitch" aria-label="Defrag home">
        <span className="text-2xl font-heading text-main leading-none bg-primary/85 backdrop-blur px-2 py-1 -ml-2">
          DeFrag<span className="text-accent">.wtf</span>
        </span>
      </button>

      {/* controls */}
      <div className="pointer-events-auto order-2 lg:order-3 lg:flex-1 flex items-center justify-end gap-2 text-xs whitespace-nowrap ml-auto lg:ml-0">
        <button onClick={() => setLang(lang === 'en' ? 'uk' : 'en')} className="chip bg-primary/85 backdrop-blur" title="Summary language">{lang === 'en' ? 'EN' : 'UA'}</button>
        <ThemeToggle />
        <button onClick={onOpenStack} className={`chip bg-primary/85 backdrop-blur ${stackCount ? 'chip-on' : ''}`}>
          <Layers size={12} /> <span className="hidden sm:inline">MY </span>STACK{stackCount ? ` · ${stackCount}` : ''}
        </button>
        <button onClick={onOpenSearch} className="chip bg-primary/85 backdrop-blur" aria-label="Search (Ctrl+K)">
          <Search size={12} /><span className="hidden md:inline">SEARCH</span><kbd className="hidden md:inline text-[10px] ml-1">⌘K</kbd>
        </button>
      </div>

      {/* floating pill */}
      <div className="pointer-events-auto order-3 lg:order-2 basis-full lg:basis-auto min-w-0">
        <div className="pill-dither mx-auto w-full lg:w-[520px] max-w-full p-1.5">
          <nav className="scroll-x flex items-center gap-1" aria-label="Sections">
            <LogoMark className="h-8 w-8 shrink-0 mr-1" />
            {TABS.map((t) => {
              const count = t.id === 'saved' ? savedCount : t.id === 'radar' ? radarCount : 0;
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={on ? 'page' : undefined}
                  className={`relative shrink-0 px-3 py-1.5 text-[13px] uppercase transition-colors rounded-[3px] ${on ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white'}`}
                  style={{ letterSpacing: '0.34px' }}
                >
                  {t.label}
                  {count > 0 && <span className={`absolute -right-0.5 top-0.5 h-2 w-2 rounded-full ${t.id === 'radar' ? 'bg-[#d6a878]' : 'bg-white/60'}`} aria-label={`${count}`} />}
                </button>
              );
            })}
          </nav>
          {SHOW_TICKER && <div className="mt-1.5"><Ticker text={ticker} /></div>}
        </div>
      </div>
    </div>
  </header>
);

export default Header;
