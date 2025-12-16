import React, { useState, useEffect } from 'react';

const BootLoader = ({ onComplete }) => {
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0); // 0: Decoding, 1: Loading, 2: Complete
  const [isVisible, setIsVisible] = useState(true);

  const TARGET_TEXT = "DEFRAG_CORE_SYSTEM";
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

  // Phase 0: Text Decoding (0 - 1s)
  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setText(prev => 
        TARGET_TEXT
          .split("")
          .map((letter, index) => {
            if (index < iteration) {
              return letter;
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );

      if (iteration >= TARGET_TEXT.length) {
        clearInterval(interval);
        setTimeout(() => setPhase(1), 200); // Small pause before phase 1
      }
      
      iteration += 1 / 2; // Speed of decoding
    }, 30);

    return () => clearInterval(interval);
  }, []);

  // Phase 1: Progress Bar (1s - 2s)
  useEffect(() => {
    if (phase === 1) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setPhase(2);
            return 100;
          }
          return prev + 2; // Speed of progress
        });
      }, 20);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Phase 2: Exit Animation (2s - 2.5s)
  useEffect(() => {
    if (phase === 2) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onComplete) onComplete();
      }, 500); // 0.5s for the exit animation
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  if (!isVisible) return null;

  // Generate ASCII progress bar
  const totalBlocks = 20;
  const filledBlocks = Math.floor((progress / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  const progressBar = `[${'/'.repeat(filledBlocks)}${'.'.repeat(emptyBlocks)}]`;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090b] text-white font-mono overflow-hidden transition-transform duration-500 ease-in-out ${phase === 2 ? 'animate-slide-up' : ''}`}>
      {/* Glitch Overlay for Phase 2 */}
      {phase === 2 && (
        <div className="absolute inset-0 bg-transparent animate-glitch opacity-50 pointer-events-none"></div>
      )}

      {/* Content Container */}
      <div className="relative z-10 text-center space-y-4">
        {/* Decoded Text */}
        <h1 className="text-2xl md:text-4xl font-bold tracking-wider text-white">
          <span className="text-neon-cyan mr-2">{'>'}</span>
          {text}
          <span className="animate-pulse">_</span>
        </h1>

        {/* Progress Bar (Only show after phase 0) */}
        {phase >= 1 && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-neon-cyan text-lg md:text-xl tracking-widest">
              {progressBar} {progress}%
            </div>
            <div className="text-xs text-neutral-500 uppercase tracking-widest">
              Loading Modules...
            </div>
          </div>
        )}
      </div>

      {/* Corner Decorations */}
      <div className="absolute top-4 left-4 text-xs text-neutral-600">
        SYS.VER.2.0.4<br/>
        MEM: 64TB OK
      </div>
      <div className="absolute bottom-4 right-4 text-xs text-neutral-600 text-right">
        SECURE CONNECTION<br/>
        ENCRYPTED
      </div>
    </div>
  );
};

export default BootLoader;
