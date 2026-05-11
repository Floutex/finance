import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
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
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "slide-up-fade": "slide-up-fade 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-right": "slide-right 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-left": "slide-left 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "blur-in": "blur-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",
        "rise-up": "rise-up 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "bg-pulse": "bg-pulse 8s ease-in-out infinite",
        "bg-pulse-fast": "bg-pulse-fast 3s ease-in-out infinite",
        "greeting-in": "greeting-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "greeting-out": "greeting-out 0.6s ease-in-out forwards",
        "letter-reveal": "letter-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "particle-rise": "particle-rise 2s ease-out forwards",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        "slide-up-fade": {
          "0%": { transform: "translateY(30px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        "slide-right": {
          "0%": { transform: "translateX(-40px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" }
        },
        "slide-left": {
          "0%": { transform: "translateX(40px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" }
        },
        "scale-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "blur-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        "rise-up": {
          "0%": { transform: "translateY(40px) scale(0.95)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" }
        },
        "bg-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" }
        },
        "bg-pulse-fast": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.8" },
          "50%": { transform: "scale(1.1)", opacity: "1" }
        },
        "greeting-in": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "greeting-out": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(1.05)" }
        },
        "letter-reveal": {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.8)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "glow-pulse": {
          "0%, 100%": { textShadow: "0 0 16px rgba(255,255,255,0.25)" },
          "50%": { textShadow: "0 0 22px rgba(255,255,255,0.4)" }
        },
        "particle-rise": {
          "0%": { opacity: "0", transform: "translateY(0) scale(0)" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translateY(-100px) scale(1)" }
        }
      }
    }
  },
  plugins: []
}

export default config

