import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import StatsStrip from './components/StatsStrip';
import FeedView from './components/FeedView';
import RadarView from './components/RadarView';
import GraphView from './components/GraphView';
import TrendsView from './components/TrendsView';
import AskView from './components/AskView';
import EventCard from './components/EventCard';
import StackDrawer from './components/StackDrawer';
import SearchModal from './components/SearchModal';
import Hero from './components/Hero';
import Splash from './components/Splash';
import DefragButton from './components/DefragButton';
import InstallPrompt from './components/InstallPrompt';
import { useLocalStorage, useAsync } from './lib/hooks';
import { getAlerts, getStats, getEvents } from './lib/api';
import { normalizeSaved } from './lib/format';

// Bottom-right floating tools (force-defrag button, PWA install toast): switched off, code kept.
const SHOW_FLOATING_TOOLS = false;

function App() {
  // The splash (scribble -> ring -> ASCII wipe) plays on every page load, but never with reduced motion.
  const [splash, setSplash] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const endSplash = useCallback(() => setSplash(false), []);

  const [tab, setTab] = useState(() => (window.location.hash.slice(1) || 'feed'));
  const [stack, setStack] = useLocalStorage('defrag_stack', []);
  const [lang, setLang] = useLocalStorage('defrag_lang', 'en');
  const [savedRaw, setSaved] = useLocalStorage('defrag_saved_items', []);
  const saved = savedRaw.map(normalizeSaved);

  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isStackOpen, setStackOpen] = useState(false);
  const [entity, setEntity] = useState(null);

  const statsQ = useAsync(getStats, []);
  const topQ = useAsync(() => getEvents({ type: 'signal', days: 2, sort: 'impact', limit: 9 }), []);
  const heroLabels = topQ.data?.events?.map((e) => e.entities[0] || e.short_tag).filter(Boolean);
  const st = statsQ.data;
  const ticker = st
    ? `${st.events_24h} events today · ${st.signal_24h} high signal · ${st.sources_active}/${st.sources_total} sources live`
    : 'Signal over noise · events, not articles';
  const radar = useAsync(() => (stack.length ? getAlerts({ stack }) : Promise.resolve({ alerts: [] })), [stack.join(',')]);

  useEffect(() => { window.location.hash = tab === 'feed' ? '' : tab; }, [tab]);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleSave = useCallback((event) => {
    setSaved((prev) => {
      const list = prev.map(normalizeSaved);
      return list.some((s) => s.id === event.id) ? list.filter((s) => s.id !== event.id) : [event, ...list];
    });
  }, [setSaved]);

  const openEntity = (name) => { setEntity(name); setTab('feed'); };

  return (
    <div className="min-h-screen font-mono selection:bg-accent selection:text-black pb-24">
      {splash && <Splash onDone={endSplash} />}
      <Header
          tab={tab} setTab={setTab} lang={lang} setLang={setLang}
          onOpenSearch={() => setSearchOpen(true)} onOpenStack={() => setStackOpen(true)}
          stackCount={stack.length} savedCount={saved.length} radarCount={radar.data?.alerts?.length || 0} ticker={ticker}
      />

      {tab === 'feed' && (
        <Hero
          stats={statsQ.data}
          onEnter={() => document.getElementById('feed-start')?.scrollIntoView({ behavior: 'smooth' })}
        />
      )}

      <div className="container mx-auto px-4 max-w-6xl">
        <main className="mt-8" id="feed-start">
          {tab === 'feed' && (
            <>
              <StatsStrip stats={statsQ.data} />
              <FeedView stack={stack} lang={lang} saved={saved} onSave={toggleSave} entity={entity} setEntity={setEntity} />
            </>
          )}
          {tab === 'radar' && (
            <RadarView radar={radar} stack={stack} lang={lang} saved={saved} onSave={toggleSave} onOpenStack={() => setStackOpen(true)} onEntity={openEntity} />
          )}
          {tab === 'graph' && <GraphView stack={stack} labels={heroLabels} onOpenEntity={openEntity} />}
          {tab === 'trends' && <TrendsView onOpenEntity={openEntity} />}
          {tab === 'ask' && <AskView />}
          {tab === 'saved' && (
            saved.length === 0 ? (
              <div className="text-center py-24 text-muted border border-dashed border-base-border">Nothing saved yet. Use “save” on any event.</div>
            ) : (
              <div className="space-y-4">
                {saved.map((e) => <EventCard key={e.id} event={e} lang={lang} isSaved onSave={toggleSave} onEntity={openEntity} />)}
              </div>
            )
          )}
        </main>
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} />
      <StackDrawer isOpen={isStackOpen} onClose={() => setStackOpen(false)} stack={stack} setStack={setStack} />
      {SHOW_FLOATING_TOOLS && (
        <>
          <DefragButton onDefragComplete={() => window.location.reload()} />
          <InstallPrompt />
        </>
      )}
    </div>
  );
}

export default App;
