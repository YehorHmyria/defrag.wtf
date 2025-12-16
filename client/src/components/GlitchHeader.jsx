import logo from '../assets/defrag-logo.png';

const GlitchHeader = ({ onOpenSearch }) => {
  return (
    <header className="py-8 flex justify-between items-center border-b border-neutral-800 bg-dedsec-black/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <img src={logo} alt="Defrag Logo" className="w-12 h-12 object-contain" />
        <h1 className="text-3xl font-heading text-white select-none animate-glitch">
          DeFrag_wtf<span className="text-neon-cyan animate-blink">_</span>
        </h1>
      </div>

      <nav className="flex items-center gap-4 font-mono text-sm">
        <button 
          onClick={onOpenSearch}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-dashed border-neutral-700 hover:border-neon-cyan text-neutral-400 hover:text-neon-cyan transition-all group"
        >
          <span>{'>_'} SEARCH</span>
          <span className="text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-500 group-hover:text-neon-cyan/70">CMD+K</span>
        </button>
        <div className="h-4 w-px bg-neutral-800 hidden md:block"></div>
        <a href="#" className="text-neutral-400 hover:text-dedsec-black hover:bg-neon-cyan px-2 py-1 transition-colors duration-100">[ HOME ]</a>
         {/* <a href="#" className="text-neutral-400 hover:text-dedsec-black hover:bg-neon-cyan px-2 py-1 transition-colors duration-100">[ LOGS ]</a> */}
      </nav>
    </header>
  );
};

export default GlitchHeader;
