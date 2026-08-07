/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './providers/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        card: 'hsl(var(--card) / <alpha-value>)',
        'card-hover': 'hsl(var(--card-hover) / <alpha-value>)',
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          blue: '#3B82F6',
          cyan: '#06B6D4',
          violet: '#8B5CF6',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
        },
        border: {
          subtle: 'var(--border-subtle)',
          glow: 'rgba(59, 130, 246, 0.3)',
        },
      },
      backgroundImage: {
        'glass-gradient': 'var(--glass-gradient)',
        'blue-purple-gradient': 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
        'emerald-cyan-gradient': 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
        'card-glow': 'var(--card-glow)',
      },
      boxShadow: {
        glass: 'var(--shadow-glass)',
        glow: '0 0 20px rgba(59, 130, 246, 0.25)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.25)',
      },
    },
  },
  plugins: [],
};
