import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MarqueeTicker from './components/MarqueeTicker';
import GlitchHeader from './components/GlitchHeader';
import ArticleCard from './components/ArticleCard';
import DefragButton from './components/DefragButton';
import LoadingState from './components/LoadingState';
import { Terminal, Code, Cpu } from 'lucide-react';

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
      // Fallback for demo if API fails or backend not running yet
      setError('FAILED TO CONNECT TO MAIN FRAME. RETRYING...');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchArticles, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Find Hero Article (Highest Impact Score)
  const heroArticle = articles.length > 0 
    ? articles.reduce((prev, current) => (prev.impact_score > current.impact_score) ? prev : current)
    : null;

  // Filter out hero from main grid
  const gridArticles = articles.filter(a => a.id !== heroArticle?.id);

  return (
    <div className="min-h-screen relative flex flex-col">
      <MarqueeTicker />
      
      <main className="flex-grow container mx-auto px-4 pb-20 max-w-7xl">
        <GlitchHeader />

        {loading ? (
          <LoadingState />
        ) : error && articles.length === 0 ? (
          <div className="text-center py-20 border-4 border-red-600 my-10 bg-black">
            <h2 className="text-4xl font-heading text-red-600 mb-4">SYSTEM CRITICAL_ERROR</h2>
            <p className="font-mono text-white mb-8">{error}</p>
            <button onClick={fetchArticles} className="btn-neo bg-red-600 text-black border-red-600 hover:bg-white hover:text-red-600">
              REBOOT SYSTEM
            </button>
          </div>
        ) : (
          <div className="space-y-12 py-12">
            {/* Stats Bar */}
            <div className="flex flex-wrap justify-between items-center border-y border-neutral-800 py-4 font-mono text-xs md:text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <Terminal size={14} />
                <span>STATUS: SYSTEM_ONLINE</span>
              </div>
              <div className="flex items-center gap-2">
                <Code size={14} />
                <span>ARTICLES_LOADED: {articles.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu size={14} />
                <span>AI_MODEL: GEMINI-1.5-FLASH</span>
              </div>
            </div>

            {/* Hero Section */}
            {heroArticle && (
              <section className="animate-[fadeIn_0.5s_ease-out]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 bg-neon-lime animate-blink"></span>
                  <h2 className="font-mono text-neon-lime text-sm tracking-widest">HIGHEST_IMPACT_DETECTED</h2>
                </div>
                <ArticleCard article={heroArticle} isHero={true} />
              </section>
            )}

            {/* Grid Section */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 gap-y-12">
              {gridArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </section>
            
            {gridArticles.length === 0 && !heroArticle && (
              <div className="text-center py-20 border-2 border-dashed border-neutral-800">
                <p className="font-mono text-neutral-500">NO DATA FOUND. DATABASE EMPTY.</p>
                <p className="font-mono text-xs text-neutral-600 mt-2">RUN MANUAL DEFRAG TO POPULATE.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t-4 border-black bg-neon-lime text-black py-12 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h3 className="font-heading text-4xl font-bold mb-2">DEFRAG.WTF</h3>
            <p className="font-mono text-sm font-bold opacity-75">
              NO COOKIES. NO TRACKING. JUST RAW DATA.
            </p>
          </div>
          
          <div className="font-mono text-xs text-right space-y-1 opacity-60">
            <div>BUILD_VER: 1.0.0-ALPHA</div>
            <div>RENDER_TIME: {new Date().toISOString()}</div>
            <div>POWERED_BY: GOOGLE_GEMINI // SUPABASE // EXPRESS</div>
          </div>
        </div>
      </footer>

      {/* Manual Trigger */}
      <DefragButton onDefragComplete={fetchArticles} />
    </div>
  );
}

export default App;
