import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        sm: "640px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Geist Sans", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
      },
      spacing: {
        // 8px base rhythm: 8, 16, 24, 40px
        '0.5': '0.125rem', // 2px (minimal)
        '1': '0.25rem',    // 4px
        '2': '0.5rem',     // 8px - base unit
        '3': '0.75rem',    // 12px
        '4': '1rem',       // 16px
        '5': '1.25rem',    // 20px
        '6': '1.5rem',     // 24px
        '8': '2rem',       // 32px
        '10': '2.5rem',    // 40px
        '12': '3rem',      // 48px
        '16': '4rem',      // 64px
      },
      fontSize: {
        // Standardized type scale - 3 clear levels
        'xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0' }],      // 12px - captions, labels
        'sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '-0.003em' }], // 14px - body small
        'base': ['0.875rem', { lineHeight: '1.6', letterSpacing: '-0.006em' }], // 14px - body (base)
        'md': ['1rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],   // 16px - emphasis
        'lg': ['1.125rem', { lineHeight: '1.4', letterSpacing: '-0.015em' }], // 18px - subheading
        'xl': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }], // 20px - heading small
        '2xl': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.025em' }], // 24px - heading
        '3xl': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.03em' }], // 30px - display
      },
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        gray: {
          50: "hsl(var(--gray-50))",
          100: "hsl(var(--gray-100))",
          200: "hsl(var(--gray-200))",
          300: "hsl(var(--gray-300))",
          400: "hsl(var(--gray-400))",
          500: "hsl(var(--gray-500))",
          600: "hsl(var(--gray-600))",
          700: "hsl(var(--gray-700))",
          800: "hsl(var(--gray-800))",
          900: "hsl(var(--gray-900))",
        },
        // Notion-inspired pastel icon colors
        icon: {
          blue: "hsl(var(--icon-blue))",
          "blue-bg": "hsl(var(--icon-blue-bg))",
          purple: "hsl(var(--icon-purple))",
          "purple-bg": "hsl(var(--icon-purple-bg))",
          pink: "hsl(var(--icon-pink))",
          "pink-bg": "hsl(var(--icon-pink-bg))",
          mint: "hsl(var(--icon-mint))",
          "mint-bg": "hsl(var(--icon-mint-bg))",
        },
        // Semantic income/expense colors
        income: {
          DEFAULT: "hsl(var(--income))",
          bg: "hsl(var(--income-bg))",
        },
        expense: {
          DEFAULT: "hsl(var(--expense))",
          bg: "hsl(var(--expense-bg))",
        },
      },
      borderRadius: {
        // Standardized border radius family - only 3 levels
        none: "0",
        sm: "0.25rem",   // 4px - small elements
        md: "0.375rem",  // 6px - default (matches --radius)
        lg: "0.5rem",    // 8px - large elements
        full: "9999px",  // full - circles, pills
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        'spring-smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out forwards",
        "fade-out": "fade-out 0.2s ease-out forwards",
        "scale-in": "scale-in 0.2s ease-out forwards",
        "scale-out": "scale-out 0.2s ease-out forwards",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out forwards",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;