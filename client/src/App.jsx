import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GlitchHeader from './components/GlitchHeader';
import ArticleCard from './components/ArticleCard';
import DefragButton from './components/DefragButton';
import LoadingState from './components/LoadingState';

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/articles');
      setArticles(response.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('CONNECTION_REFUSED: MAIN_FRAME_OFFLINE');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    const interval = setInterval(fetchArticles, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const heroArticle = articles.length > 0 
    ? articles.reduce((prev, current) => (prev.impact_score > current.impact_score) ? prev : current)
    : null;

  const gridArticles = articles.filter(a => a.id !== heroArticle?.id);

  return (
    <div className="min-h-screen relative font-mono selection:bg-neon-cyan selection:text-black pb-24">
      {/* Centered Container */}
      <div className="container mx-auto px-4 max-w-6xl">
        <GlitchHeader />

        <main className="mt-12">
          {loading ? (
            <LoadingState />
          ) : error && articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-hot-pink/50 bg-hot-pink/5">
              <h2 className="text-2xl font-heading text-hot-pink mb-2">SYSTEM CRITICAL_ERROR</h2>
              <p className="text-light-gray opacity-70 mb-6">[ {error} ]</p>
              <button onClick={fetchArticles} className="btn-dedsec border-hot-pink text-hot-pink hover:bg-hot-pink hover:text-white">
                RETRY HANDSHAKE
              </button>
            </div>
          ) : (
            <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
              {/* Stats / Status Line */}
              <div className="flex justify-between border-b border-dashed border-neutral-800 pb-2 text-xs text-neutral-600 uppercase tracking-widest">
                <span>Status: ONLINE</span>
                <span>Packets: {articles.length}</span>
                <span>Security: BYPASSED</span>
              </div>

              {/* Hero Section */}
              {heroArticle && (
                <section>
                  <ArticleCard article={heroArticle} isHero={true} />
                </section>
              )}

              {/* Grid Section */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gridArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </section>
              
              {gridArticles.length === 0 && !heroArticle && (
                <div className="text-center py-32 opacity-50">
                   {`// NO DATA PACKETS FOUND`}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Manual Trigger (Fixed Bottom Right) */}
      <DefragButton onDefragComplete={fetchArticles} />
    </div>
  );
}

export default App;
