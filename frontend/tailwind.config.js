/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Evergreen theme. `brand` is the single accent (buttons, active nav, links, focus).
        brand: {
          50: '#EEF7F4',
          100: '#D5ECE4',
          200: '#ABD9CA',
          300: '#77BFA8',
          400: '#3F9F84',
          500: '#148A6E',
          600: '#0B7A62',
          700: '#0A6552',
          800: '#0B5143',
          900: '#0B3B30',
          950: '#062820',
        },
        // Neutrals: Tailwind's `slate` retuned to Evergreen's green-tinted greys,
        // so every existing slate-* utility follows the theme.
        slate: {
          50: '#F8F9F7',
          100: '#F1F3F0',
          200: '#E3E6E1',
          300: '#CDD2CB',
          400: '#66716B',
          500: '#57625C',
          600: '#46524C',
          700: '#333D38',
          800: '#222B27',
          900: '#16201C',
          950: '#0C1310',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Kantumruy Pro', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Space Grotesk', 'Inter', 'Kantumruy Pro', 'system-ui', 'sans-serif'],
        khmer: ['Kantumruy Pro', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        glow: '0 0 25px -5px rgba(59, 130, 246, 0.15)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
