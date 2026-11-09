import React, { useState, useEffect } from 'react';

// Legacy themes are kept in index.css but switched off (enabled: false), so they can't be selected.
const ALL_THEMES = [
  { id: 'paper', label: 'PAPER', enabled: true },
  { id: 'ink', label: 'INK', enabled: true },
  { id: 'dedsec', label: 'DEDSEC', enabled: false },
  { id: 'institute', label: 'INSTITUTE', enabled: false },
  { id: 'night_shift', label: 'NIGHT_SHIFT', enabled: false },
  { id: 'kernel_panic', label: 'KERNEL_PANIC', enabled: false },
];
const THEMES = ALL_THEMES.filter((t) => t.enabled);

const ThemeToggle = () => {
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);

  useEffect(() => {
    // Load from local storage
    const savedTheme = localStorage.getItem('defrag_theme');
    const index = THEMES.findIndex(t => t.id === savedTheme);
    if (index !== -1) {
      setCurrentThemeIndex(index);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // nothing saved, or a disabled legacy theme was saved earlier
      // Default
      document.documentElement.setAttribute('data-theme', 'paper');
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
      className="chip bg-primary/85 backdrop-blur select-none"
    >
      THEME · {THEMES[currentThemeIndex].label}
    </button>
  );
};

export default ThemeToggle;
