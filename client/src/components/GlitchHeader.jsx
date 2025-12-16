import logo from '../assets/defrag-logo.png';
import ThemeToggle from './ThemeToggle';

const GlitchHeader = ({ onOpenSearch }) => {
  return (
    <header className="py-8 flex justify-between items-center border-b border-base-border bg-primary/80 backdrop-blur-sm sticky top-0 z-40 transition-colors duration-300">
      <div className="flex items-center gap-4">
        <img src={logo} alt="Defrag Logo" className="w-12 h-12 object-contain invert-[.15] dark:invert-0" /> 
        <h1 className="text-3xl font-heading text-main select-none animate-glitch">
          DeFrag_wtf<span className="text-accent animate-blink">_</span>
        </h1>
      </div>

      <nav className="flex items-center gap-4 font-mono text-sm">
        <ThemeToggle />
        <div className="h-4 w-px bg-neutral-800 hidden md:block"></div>
        <button 
          onClick={onOpenSearch}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-dashed border-base-border hover:border-accent text-muted hover:text-accent transition-all group"
        >
          <span>{'>_'} SEARCH</span>
          <span className="text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-500 group-hover:text-accent/70">CMD+K</span>
        </button>
        <div className="h-4 w-px bg-neutral-800 hidden md:block"></div>
        <a href="#" className="text-muted hover:text-primary hover:bg-accent px-2 py-1 transition-colors duration-100">[ HOME ]</a>
      </nav>
    </header>
  );
};

export default GlitchHeader;
