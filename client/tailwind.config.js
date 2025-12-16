/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic Names
        'primary': 'var(--bg-primary)', // Main background
        'secondary': 'var(--bg-secondary)', // Card background (optional differentiation)
        'main': 'var(--text-main)', // Main text
        'muted': 'var(--text-muted)', // Muted text
        'base-border': 'var(--border-base)', // Borders
        'accent': 'var(--color-accent)', // Primary action/highlight
        'accent-secondary': 'var(--color-secondary)',
        'hot': 'var(--color-hot)',

        // Legacy / Palette Mapping (Redirect to vars to allow theme switching)
        'dedsec-black': 'var(--bg-primary)', 
        'neon-cyan': 'var(--color-accent)',
        'hot-pink': 'var(--color-hot)',
        'bright-yellow': 'var(--color-secondary)',
        'light-gray': 'var(--text-muted)',
      },
      fontFamily: {
        'heading': ['"VT323"', 'monospace'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      borderWidth: {
        '1': '1px',
        '2': '2px',
      },
      animation: {
        'glitch': 'glitch 0.2s cubic-bezier(.25, .46, .45, .94) both infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
