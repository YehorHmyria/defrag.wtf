import React from 'react';
import { Filter, Archive, X } from 'lucide-react';

const ControlBar = ({ 
  activeTag, 
  clearTag,
  view,
  setView 
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-dashed border-base-border font-mono text-sm animate-[fadeIn_0.5s_ease-out]">
      
      {/* Left: Filter Controls */}
      <div className="flex items-center gap-6">

        {/* Active Tag Filter */}
        {activeTag && (
          <div className="flex items-center gap-2 text-accent">
            <Filter size={14} />
            <span>FILTER: {activeTag}</span>
            <button 
              onClick={clearTag}
              className="hover:text-main transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Right: View Switcher */}
      <div className="flex items-center gap-1 bg-secondary/50 p-1 border border-base-border">
        <button
          onClick={() => setView('signal')}
          className={`px-3 py-1 transition-colors ${view === 'signal' ? 'bg-primary text-main border border-base-border' : 'text-muted hover:text-main'}`}
        >
          [ /relevant ]
        </button>
        <button
          onClick={() => setView('trash')}
          className={`px-3 py-1 transition-colors ${view === 'trash' ? 'bg-primary text-main border border-base-border' : 'text-muted/60 hover:text-muted'}`}
        >
          [ /null ]
        </button>
        <button
          onClick={() => setView('logs')}
          className={`flex items-center gap-2 px-3 py-1 transition-colors ${view === 'logs' ? 'bg-primary text-main border border-base-border' : 'text-muted hover:text-main'}`}
        >
          <Archive size={14} />
          [ /logs ]
        </button>
      </div>
    </div>
  );
};

export default ControlBar;
