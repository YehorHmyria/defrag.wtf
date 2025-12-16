import React from 'react';

const GlitchHeader = () => {
  return (
    <header className="py-12 px-6 flex flex-col items-center justify-center border-b-4 border-neutral-900 bg-almost-black relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 border-l-4 border-t-4 border-white"></div>
        <div className="absolute bottom-10 right-10 w-20 h-20 border-r-4 border-b-4 border-white"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[1px] bg-neutral-800 rotate-45"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[1px] bg-neutral-800 -rotate-45"></div>
      </div>

      <h1 className="z-10 text-6xl md:text-8xl lg:text-9xl font-black text-white glitch-hover cursor-pointer relative mix-blend-difference select-none group">
        <span className="group-hover:text-neon-lime">DEFRAG</span>
        <span className="text-neutral-500">.</span>
        <span className="group-hover:text-hot-pink">WTF</span>
      </h1>
      
      <p className="mt-4 font-mono text-neutral-400 text-sm md:text-base tracking-widest uppercase">
        [ Brutal Tech Aggregator // AI Defragmentation Active ]
      </p>

      {/* Navigation */}
      <nav className="mt-8 flex gap-8 font-mono text-neon-lime z-10">
        <a href="#" className="hover:bg-neon-lime hover:text-black px-2 transition-colors duration-0 underline decoration-2 decoration-hot-pink underline-offset-4">/HOME</a>
        <a href="#" className="hover:bg-neon-lime hover:text-black px-2 transition-colors duration-0 underline decoration-2 decoration-electric-blue underline-offset-4">/ARCHIVE</a>
        <a href="#" className="hover:bg-neon-lime hover:text-black px-2 transition-colors duration-0 underline decoration-2 decoration-white underline-offset-4">/ABOUT</a>
      </nav>
    </header>
  );
};

export default GlitchHeader;
