/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        /* New Design System Tokens (Appendix A) */
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          contrast: 'var(--accent-contrast)',
          soft: 'var(--accent-soft)',
          'soft-text': 'var(--accent-soft-text)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          soft: 'var(--warning-soft)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
        },
        chart: {
          protein: 'var(--chart-protein)',
          carbs: 'var(--chart-carbs)',
          fat: 'var(--chart-fat)',
          line: 'var(--chart-line)',
          goal: 'var(--chart-goal)',
        },

        /* Legacy design tokens retained for unmigrated views (deleted in M13) */
        'legacy-bone': 'var(--color-bone)',
        'legacy-graphite': 'var(--color-graphite)',
        'legacy-charcoal': 'var(--color-charcoal)',
        'legacy-olive': 'var(--color-olive)',
        'legacy-accent': 'var(--color-accent)',
        'legacy-faded': 'var(--color-faded)',
        'legacy-border': 'var(--color-border)',

        /* Compatibility aliases for views undergoing transition */
        bone: 'var(--color-bone)',
        graphite: 'var(--color-graphite)',
        charcoal: 'var(--color-charcoal)',
        olive: 'var(--color-olive)',
        faded: 'var(--color-faded)',
        borderLine: 'var(--color-border)',
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        display: ['"Inter Variable"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        normal: '0',
        wide: '0.025em',
        widest: '0.05em',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        float: 'var(--shadow-float)',
      },
    },
  },
  plugins: [],
}
