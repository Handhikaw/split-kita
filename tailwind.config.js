/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // SplitKita Design System v1.0
        sk: {
          bg:       '#0f0f13',
          surface:  '#17171e',
          surface2: '#1e1e28',
          border:   '#2a2a38',
          // Light
          'bg-l':       '#f4f3f8',
          'surface-l':  '#ffffff',
          'surface2-l': '#eef0f7',
          'border-l':   '#e0dff0',
          // Text dark
          text:   '#f0f0f8',
          text2:  '#8888a8',
          text3:  '#555578',
          // Text light
          'text-l':  '#18172c',
          'text2-l': '#6b6893',
          'text3-l': '#a8a6c8',
        },
        // Accents
        violet: { sk: '#7c6aff' },
        pink:   { sk: '#ff6a8e' },
        teal:   { sk: '#6affd4' },
      },
      borderRadius: {
        sk:    '16px',
        'sk-sm': '10px',
        'sk-pill': '20px',
      },
      boxShadow: {
        'sk-glow-violet': '0 0 0 3px rgba(124,106,255,0.20)',
        'sk-glow-teal':   '0 0 0 3px rgba(106,255,212,0.15)',
        'sk-glow-pink':   '0 0 0 3px rgba(255,106,142,0.15)',
        'sk-btn-violet':  '0 4px 16px rgba(124,106,255,0.35)',
        'sk-btn-hover':   '0 8px 28px rgba(124,106,255,0.45)',
        'sk-card-l':      '0 2px 12px rgba(100,90,180,0.10)',
        'sk-card-hover-l':'0 6px 24px rgba(100,90,180,0.14)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer':    'shimmer 2.5s ease infinite',
        'float':      'float 6s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
