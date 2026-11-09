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
        'primary': 'rgb(var(--bg-primary-rgb) / <alpha-value>)', // Main background
        'secondary': 'rgb(var(--bg-secondary-rgb) / <alpha-value>)', // Card background (optional differentiation)
        'main': 'rgb(var(--text-main-rgb) / <alpha-value>)', // Main text
        'muted': 'rgb(var(--text-muted-rgb) / <alpha-value>)', // Muted text
        'base-border': 'rgb(var(--border-base-rgb) / <alpha-value>)', // Borders
        'accent': 'rgb(var(--color-accent-rgb) / <alpha-value>)', // Primary action/highlight
        'accent-secondary': 'rgb(var(--color-secondary-rgb) / <alpha-value>)',
        'hot': 'rgb(var(--color-hot-rgb) / <alpha-value>)',

        // Legacy / Palette Mapping (Redirect to vars to allow theme switching)
        'dedsec-black': 'rgb(var(--bg-primary-rgb) / <alpha-value>)', 
        'neon-cyan': 'rgb(var(--color-accent-rgb) / <alpha-value>)',
        'hot-pink': 'rgb(var(--color-hot-rgb) / <alpha-value>)',
        'bright-yellow': 'rgb(var(--color-secondary-rgb) / <alpha-value>)',
        'light-gray': 'rgb(var(--text-muted-rgb) / <alpha-value>)',
      },
      fontFamily: {
        'heading': ['var(--font-heading)'],
        'mono': ['var(--font-mono)'],
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
