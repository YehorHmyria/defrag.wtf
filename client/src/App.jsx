import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GlitchHeader from './components/GlitchHeader';
import ArticleCard from './components/ArticleCard';
import DefragButton from './components/DefragButton';
import LoadingState from './components/LoadingState';
import BootLoader from './components/BootLoader';
import SearchModal from './components/SearchModal';
import ControlBar from './components/ControlBar';

function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showBootLoader, setShowBootLoader] = useState(() => {
    // Check session storage
    const hasBooted = sessionStorage.getItem('hasBooted');
    if (!hasBooted) {
      sessionStorage.setItem('hasBooted', 'true');
      return true;
    }
    return false; // Change to true to force show on every reload
  });

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // New States for Filtering & Bookmarks
  const [savedArticles, setSavedArticles] = useState(() => {
    const saved = localStorage.getItem('defrag_saved_items');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTag, setActiveTag] = useState(null);
  const [hideNoise, setHideNoise] = useState(false);
  const [view, setView] = useState('signal'); // 'signal' | 'trash' | 'logs'
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchArticles = async (reset = false) => {
    if (reset) {
       setLoading(true);
       setPage(1);
       setHasMore(true);
    } else {
       setLoadingMore(true);
    }

    try {
      const currentPage = reset ? 1 : page;
      const response = await axios.get(`/api/articles`, {
          params: {
              page: currentPage,
              limit: 20,
              type: view === 'logs' ? 'signal' : view // If logs, irrelevant, but just send valid type
          }
      });
      
      const newArticles = response.data;
      
      if (reset) {
        setArticles(newArticles);
      } else {
        setArticles(prev => [...prev, ...newArticles]);
      }

      if (newArticles.length < 20) {
          setHasMore(false);
      } else {
          setPage(prev => prev + 1);
      } // Bug fix: this sets next page only AFTER fetch. Correct logic is: fetch DONE, prepare next page. 
      // Actually simpler: `setPage(currentPage + 1)`
      if (newArticles.length >= 20) setPage(currentPage + 1);

      setLoading(false);
      setLoadingMore(false);
    } catch (err) {
      console.error(err);
      if (reset) {
          setError('CONNECTION_REFUSED: MAIN_FRAME_OFFLINE');
          setLoading(false);
      } else {
          setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    fetchArticles(true);
    // Poll every 5 minutes only if on first page/signal view
    const interval = setInterval(() => {
        if (view === 'signal' && page === 1) fetchArticles(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [view]); // Refetch when view changes

  // Infinite Scroll Handler
  useEffect(() => {
      const handleScroll = () => {
          if (view === 'logs') return; 
          if (loading || loadingMore || !hasMore) return;

          if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
              fetchArticles(false);
          }
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, loadingMore, hasMore, view, page]);

  // Save/Unsave Handler
  const toggleSave = (article) => {
    setSavedArticles(prev => {
      const exists = prev.find(a => a.id === article.id || (a.original_url === article.original_url)); // Fallback to URL if ID is missing temporary
      let newSaved;
      if (exists) {
        newSaved = prev.filter(a => a.id !== article.id && a.original_url !== article.original_url);
      } else {
        newSaved = [article, ...prev];
      }
      localStorage.setItem('defrag_saved_items', JSON.stringify(newSaved));
      return newSaved;
    });
  };

  // Filter Logic
  const getFilteredArticles = () => {
    if (view === 'logs') return savedArticles;

    let filtered = articles;
    if (hideNoise) {
      filtered = filtered.filter(a => a.impact_score >= 50);
    }
    if (activeTag) {
      filtered = filtered.filter(a => a.short_tag === activeTag);
    }
    return filtered;
  };

  const displayArticles = getFilteredArticles();

  useEffect(() => {
    // Global Hotkey for Search
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Determine Hero Article (Only for Signal View and when no tag filter is active)
  const heroArticle = (view === 'signal' && !activeTag && displayArticles.length > 0) 
    ? displayArticles.reduce((prev, current) => (prev.impact_score > current.impact_score) ? prev : current)
    : null;

  const gridArticles = displayArticles.filter(a => a.id !== heroArticle?.id);

  return (
    <div className="min-h-screen relative font-mono selection:bg-neon-cyan selection:text-black pb-24">
      {/* Centered Container */}
      <div className="container mx-auto px-4 max-w-6xl">
        <SearchModal 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
          articles={articles} 
        />
        {showBootLoader && <BootLoader onComplete={() => setShowBootLoader(false)} />}
        
        <GlitchHeader onOpenSearch={() => setIsSearchOpen(true)} />

        <main className="mt-12">
          {loading ? (
             <LoadingState />
          ) : (
            <>
              <ControlBar 
                hideNoise={hideNoise}
                setHideNoise={setHideNoise}
                activeTag={activeTag}
                clearTag={() => setActiveTag(null)}
                view={view}
                setView={setView}
              />
              
              {/* Error State (Only if API failed AND we are on Feed types) */}
              {error && articles.length === 0 && view !== 'logs' ? (
                 <div className="flex flex-col items-center justify-center py-20 border border-hot-pink/50 bg-hot-pink/5">
                   <h2 className="text-2xl font-heading text-hot-pink mb-2">SYSTEM CRITICAL_ERROR</h2>
                   <p className="text-light-gray opacity-70 mb-6">[ {error} ]</p>
                   <button onClick={() => fetchArticles(true)} className="btn-dedsec border-hot-pink text-hot-pink hover:bg-hot-pink hover:text-white">
                     RETRY HANDSHAKE
                   </button>
                 </div>
              ) : (
                 <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
                   {/* Status Line */}
                   <div className="flex justify-between border-b border-dashed border-neutral-800 pb-2 text-xs text-neutral-600 uppercase tracking-widest">
                     <span>Mode: {view === 'logs' ? 'OFFLINE_STORAGE' : view === 'trash' ? 'GARBAGE_COLLECTION' : 'LIVE_FEED'}</span>
                     <span>Packets: {displayArticles.length}</span>
                     <span>Filter: {activeTag || 'ALL'}</span>
                   </div>

                   {/* Empty State for Logs */}
                   {view === 'logs' && savedArticles.length === 0 && (
                     <div className="text-center py-32 border border-dashed border-neutral-800 rounded">
                        <p className="text-neon-cyan mb-2 font-mono text-lg">{'>'} NO PACKETS CAPTURED.</p>
                        <p className="text-neutral-500 font-mono text-sm">{'>'} RETURN TO MAIN FEED TO INITIATE DATA COLLECTION...</p>
                     </div>
                   )}

                   {/* Hero Section */}
                   {heroArticle && (
                     <section>
                       <ArticleCard 
                         article={heroArticle} 
                         isHero={true} 
                         onSave={toggleSave}
                         isSaved={savedArticles.some(s => s.id === heroArticle.id || s.original_url === heroArticle.original_url)}
                         onTagClick={setActiveTag}
                       />
                     </section>
                   )}
 
                   {/* Grid Section */}
                   <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {gridArticles.map((article) => (
                       <ArticleCard 
                         key={article.id || article.original_url} 
                         article={article} 
                         onSave={toggleSave}
                         isSaved={savedArticles.some(s => s.id === article.id || s.original_url === article.original_url)}
                         onTagClick={setActiveTag}
                       />
                     ))}
                   </section>
                   
                   {/* Empty Filter Result */}
                   {gridArticles.length === 0 && !heroArticle && view !== 'logs' && !loading && (
                     <div className="text-center py-32 opacity-50">
                        {`// NO DATA PACKETS FOUND MATCHING CRITERIA`}
                     </div>
                   )}

                   {/* Infinite Scroll Loader */}
                   {loadingMore && (
                      <div className="py-8 text-center text-neon-cyan animate-pulse font-mono flex flex-col items-center">
                         <span>[ SCANNING SECTORS... ]</span>
                      </div>
                   )}
                   
                   {!hasMore && view !== 'logs' && displayArticles.length > 0 && (
                      <div className="py-8 text-center text-neutral-600 font-mono text-xs">
                         /// END OF BUFFER ///
                      </div>
                   )}
                 </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Manual Trigger (Fixed Bottom Right) */}
      <DefragButton onDefragComplete={fetchArticles} />
    </div>
  );
}

export default App;
