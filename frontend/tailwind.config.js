import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree Variable', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        card: '1.375rem',
        tile: '0.875rem',
      },
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',

        surface: {
          DEFAULT: 'hsl(var(--surface) / <alpha-value>)',
          card: 'hsl(var(--surface-card) / <alpha-value>)',
          border: 'hsl(var(--surface-border) / <alpha-value>)',
        },

        'brand-primary': {
          DEFAULT: 'hsl(var(--brand-primary) / <alpha-value>)',
          contrast: 'hsl(var(--brand-primary-contrast) / <alpha-value>)',
          ink: 'hsl(var(--brand-primary-ink) / <alpha-value>)',
        },
        'brand-secondary': {
          DEFAULT: 'hsl(var(--brand-secondary) / <alpha-value>)',
          contrast: 'hsl(var(--brand-secondary-contrast) / <alpha-value>)',
          ink: 'hsl(var(--brand-secondary-ink) / <alpha-value>)',
        },
        'brand-tertiary': {
          DEFAULT: 'hsl(var(--brand-tertiary) / <alpha-value>)',
          contrast: 'hsl(var(--brand-tertiary-contrast) / <alpha-value>)',
          ink: 'hsl(var(--brand-tertiary-ink) / <alpha-value>)',
        },
        'brand-quaternary': {
          DEFAULT: 'hsl(var(--brand-quaternary) / <alpha-value>)',
          contrast: 'hsl(var(--brand-quaternary-contrast) / <alpha-value>)',
          ink: 'hsl(var(--brand-quaternary-ink) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
