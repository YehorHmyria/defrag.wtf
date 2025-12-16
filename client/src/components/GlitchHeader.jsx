import logo from '../assets/defrag-logo.png';

const GlitchHeader = () => {
  return (
    <header className="py-8 flex justify-between items-center border-b border-neutral-800 bg-dedsec-black/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <img src={logo} alt="Defrag Logo" className="w-12 h-12 object-contain" />
        <h1 className="text-3xl font-heading text-white select-none animate-glitch">
          dEFRaG_wTF<span className="text-neon-cyan animate-blink">_</span>
        </h1>
      </div>

      <nav className="flex gap-6 font-mono text-sm">
        <a href="#" className="text-neutral-400 hover:text-dedsec-black hover:bg-neon-cyan px-2 py-1 transition-colors duration-100">[ HOME ]</a>
        <a href="#" className="text-neutral-400 hover:text-dedsec-black hover:bg-neon-cyan px-2 py-1 transition-colors duration-100">[ LOGS ]</a>
      </nav>
    </header>
  );
};

export default GlitchHeader;
