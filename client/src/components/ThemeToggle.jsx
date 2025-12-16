import React, { useState, useEffect } from 'react';

const THEMES = [
  { id: 'dedsec', label: 'DEDSEC' },
  { id: 'institute', label: 'INSTITUTE' },
  { id: 'night_shift', label: 'NIGHT_SHIFT' },
  { id: 'kernel_panic', label: 'KERNEL_PANIC' },
];

const ThemeToggle = () => {
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);

  useEffect(() => {
    // Load from local storage
    const savedTheme = localStorage.getItem('defrag_theme');
    if (savedTheme) {
      const index = THEMES.findIndex(t => t.id === savedTheme);
      if (index !== -1) setCurrentThemeIndex(index);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // Default
      document.documentElement.setAttribute('data-theme', 'dedsec');
    }
  }, []);

  const cycleTheme = () => {
    const nextIndex = (currentThemeIndex + 1) % THEMES.length;
    const nextTheme = THEMES[nextIndex];
    
    setCurrentThemeIndex(nextIndex);
    document.documentElement.setAttribute('data-theme', nextTheme.id);
    localStorage.setItem('defrag_theme', nextTheme.id);
  };

  return (
    <button 
      onClick={cycleTheme}
      className="text-xs font-mono text-muted hover:text-accent transition-colors select-none"
    >
      [ THEME: {THEMES[currentThemeIndex].label} ]
    </button>
  );
};

export default ThemeToggle;
