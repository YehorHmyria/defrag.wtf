import React from 'react';
import { Filter, Archive, X } from 'lucide-react';

const ControlBar = ({ 
  hideNoise, 
  setHideNoise, 
  activeTag, 
  clearTag,
  view,
  setView 
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-dashed border-neutral-800 font-mono text-sm animate-[fadeIn_0.5s_ease-out]">
      
      {/* Left: Filter Controls */}
      <div className="flex items-center gap-6">
        {/* Toggle Switch */}
        <label className="flex items-center gap-3 cursor-pointer group select-none">
          <div className="relative">
            <input 
              type="checkbox" 
              className="sr-only" 
              checked={hideNoise}
              onChange={(e) => setHideNoise(e.target.checked)}
            />
            <div className={`w-8 h-4 rounded-none border transition-colors ${hideNoise ? 'bg-neon-cyan/20 border-neon-cyan' : 'bg-transparent border-neutral-600'}`}></div>
            <div className={`absolute left-0.5 top-0.5 bg-current w-3 h-3 transition-transform ${hideNoise ? 'translate-x-4 text-neon-cyan' : 'translate-x-0 text-neutral-500'}`}></div>
          </div>
          <span className={`transition-colors ${hideNoise ? 'text-neon-cyan' : 'text-neutral-500 group-hover:text-neutral-300'}`}>
            [ HIDE_NOISE ]
          </span>
        </label>

        {/* Active Tag Filter */}
        {activeTag && (
          <div className="flex items-center gap-2 text-neon-cyan">
            <Filter size={14} />
            <span>FILTER: {activeTag}</span>
            <button 
              onClick={clearTag}
              className="hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Right: View Switcher */}
      <div className="flex items-center gap-1 bg-neutral-900/50 p-1 border border-neutral-800">
        <button
          onClick={() => setView('signal')}
          className={`px-3 py-1 transition-colors ${view === 'signal' ? 'bg-dedsec-black text-white border border-neutral-700' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          [ /relevant ]
        </button>
        <button
          onClick={() => setView('trash')}
          className={`px-3 py-1 transition-colors ${view === 'trash' ? 'bg-dedsec-black text-white border border-neutral-700' : 'text-neutral-600 hover:text-neutral-400 opacity-60'}`}
        >
          [ /null ]
        </button>
        <button
          onClick={() => setView('logs')}
          className={`flex items-center gap-2 px-3 py-1 transition-colors ${view === 'logs' ? 'bg-dedsec-black text-white border border-neutral-700' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          <Archive size={14} />
          [ /logs ]
        </button>
      </div>
    </div>
  );
};

export default ControlBar;
