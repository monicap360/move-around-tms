/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Space/Graphite Base Palette
        space: {
          deep: "#0E0F12",
          panel: "#14161B",
          surface: "#1C1F26",
          border: "#2A2E36",
          "border-subtle": "#1E2128",
        },
        // Muted Champagne Gold Accent
        gold: {
          primary: "#C7A14A",
          secondary: "#BFA15A",
          tertiary: "#9E8A4E",
          glow: "rgba(199, 161, 74, 0.15)",
          border: "rgba(199, 161, 74, 0.3)",
        },
        // Text Colors
        "text-primary": "#E6E8EC",
        "text-secondary": "#9AA0AA",
        "text-muted": "#6B7280",
        // Status Colors (Muted)
        status: {
          success: "#4A9E6B",
          warning: "#C7A14A",
          error: "#B54A4A",
          info: "#5A8EC7",
        },
        // Semantic mappings for Tailwind compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      fontFamily: {
        sans: ["Inter", "Roboto Condensed", "Helvetica Neue", "sans-serif"],
      },
      boxShadow: {
        "gold-glow": "0 0 8px rgba(199, 161, 74, 0.15)",
        "gold-glow-lg": "0 0 12px rgba(199, 161, 74, 0.2)",
      },
    },
  },
  plugins: [],
};
