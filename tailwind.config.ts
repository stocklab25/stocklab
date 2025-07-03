import type { Config } from "tailwindcss";

// Define proper types for the plugin function
interface PluginAPI {
  addUtilities: (utilities: Record<string, Record<string, string | Record<string, string>>>) => void;
  theme: (path: string) => string;
}

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        // Inventory-specific colors
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
        },
        info: {
          DEFAULT: "var(--info)",
          foreground: "var(--info-foreground)",
        },
        // Status colors
        status: {
          "in-stock": "var(--status-in-stock)",
          "low-stock": "var(--status-low-stock)",
          "out-of-stock": "var(--status-out-of-stock)",
          discontinued: "var(--status-discontinued)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
      },
      customSpacing: {
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-in": "slideIn 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      // Custom utilities for inventory system
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      maxWidth: {
        'xs': '20rem',
        'sm': '24rem',
        'md': '28rem',
        'lg': '32rem',
        'xl': '36rem',
        '2xl': '42rem',
        '3xl': '48rem',
        '4xl': '56rem',
        '5xl': '64rem',
        '6xl': '72rem',
        '7xl': '80rem',
        'full': '100%',
        'min': 'min-content',
        'max': 'max-content',
        'prose': '65ch',
        'screen': '100vw',
      },
    },
  },
  plugins: [
    // Custom plugin for inventory-specific utilities
    function({ addUtilities, theme }: PluginAPI) {
      const newUtilities = {
        // Status indicators
        ".status-indicator": {
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          display: "inline-block",
        },
        ".status-indicator-in-stock": {
          backgroundColor: theme("colors.status.in-stock"),
        },
        ".status-indicator-low-stock": {
          backgroundColor: theme("colors.status.low-stock"),
        },
        ".status-indicator-out-of-stock": {
          backgroundColor: theme("colors.status.out-of-stock"),
        },
        ".status-indicator-discontinued": {
          backgroundColor: theme("colors.status.discontinued"),
        },
        // Inventory-specific spacing
        ".inventory-grid": {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: theme("spacing.6"),
        },
        ".inventory-table": {
          width: "100%",
          borderCollapse: "collapse",
        },
        // Focus styles
        ".focus-ring": {
          outline: "none",
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: theme("colors.ring"),
            outlineOffset: "2px",
          },
        },
      };
      addUtilities(newUtilities);
    },
  ],
};

export default config; 