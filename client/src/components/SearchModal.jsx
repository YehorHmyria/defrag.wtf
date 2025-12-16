import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, CornerDownLeft } from 'lucide-react';

/* 
  Props:
  - isOpen: boolean
  - onClose: function
  - articles: array of { id, title, impact_score, original_url, short_tag }
*/
const SearchModal = ({ isOpen, onClose, articles = [] }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  
  // Filter logic
  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(query.toLowerCase()) || 
    article.short_tag?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 50); // Limit results for performance

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredArticles.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredArticles.length) % filteredArticles.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredArticles[selectedIndex]) {
           window.open(filteredArticles[selectedIndex].original_url, '_blank');
           onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredArticles, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Window */}
      <div className="relative w-full max-w-2xl bg-primary border border-accent shadow-[0_0_30px_var(--color-accent)] flex flex-col overflow-hidden animate-[fadeIn_0.1s_ease-out]">
        
        {/* Header / Input */}
        <div className="flex items-center px-4 py-4 border-b border-base-border">
           <span className="text-accent mr-3 font-bold select-none">{'>'}</span>
           <input 
             ref={inputRef}
             type="text"
             className="flex-1 bg-transparent border-none outline-none text-main font-mono placeholder-muted text-lg"
             placeholder="Search database..."
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             autoComplete="off"
           />
           <div className="hidden md:flex items-center text-xs text-neutral-500 border border-neutral-800 px-2 py-1 rounded select-none">
             ESC to close
           </div>
        </div>

        {/* Filters / Quick Actions (Only show if no query yet) */}
        {query === '' && (
          <div className="px-4 py-2 bg-secondary text-[10px] text-muted font-mono tracking-widest border-b border-base-border">
            SUGGESTED: [HIGH IMPACT] [CVE] [LATEST]
          </div>
        )}

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
           {filteredArticles.length === 0 ? (
             <div className="p-8 text-center text-neutral-500 font-mono">
                {query ? '// NO MATCHING RECORDS FOUND' : '// READY FOR INPUT'}
             </div>
           ) : (
             <ul className="py-2">
               {filteredArticles.map((article, index) => (
                 <li 
                   key={article.id || index}
                   className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors duration-75 
                     ${index === selectedIndex ? 'bg-accent/10 border-l-2 border-accent' : 'border-l-2 border-transparent hover:bg-secondary'}`}
                   onClick={() => {
                     window.open(article.original_url, '_blank');
                     onClose();
                   }}
                   onMouseEnter={() => setSelectedIndex(index)}
                 >
                   <div className="flex-1 min-w-0 pr-4">
                     <div className="flex items-center text-xs text-muted mb-1 font-mono">
                        <span className="w-6 text-right mr-3 opacity-50">{(index + 1).toString().padStart(2, '0')}</span>
                        {article.short_tag && (
                          <span className={`mr-2 px-1 text-[10px] border ${index === selectedIndex ? 'border-accent text-accent' : 'border-base-border text-muted'}`}>
                            {article.short_tag}
                          </span>
                        )}
                        <span className="opacity-70">{new Date(article.published_at).toLocaleDateString()}</span>
                     </div>
                     <h3 className={`font-mono truncate ${index === selectedIndex ? 'text-main' : 'text-muted'}`}>
                       {article.title}
                     </h3>
                   </div>
                   
                   {index === selectedIndex && (
                     <CornerDownLeft className="w-4 h-4 text-accent animate-pulse" />
                   )}
                 </li>
               ))}
             </ul>
           )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-secondary border-t border-base-border text-[10px] text-muted flex justify-between font-mono">
           <span>ROOT@DEFRAG:~$ _</span>
           <span>{filteredArticles.length} RECORDS</span>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
