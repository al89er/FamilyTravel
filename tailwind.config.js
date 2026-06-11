/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#0f766e",
          600: "#0d9488",
          700: "#0f766e",
          900: "#134e4a"
        },
        coral: "#f9735b",
        ink: "#172033",
        // Semantic tokens
        app: "var(--bg-app)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        muted: "var(--bg-muted)",
        border: "var(--border-default)",
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          foreground: "var(--color-primary-foreground)"
        },
        danger: "var(--color-danger)",
        warning: "var(--color-warning)",
        success: "var(--color-success)"
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)"
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #0891b2 100%)",
        "hero-gradient-dark": "linear-gradient(135deg, #134e4a 0%, #0f766e 60%, #155e75 100%)"
      },
      boxShadow: {
        soft: "0 4px 24px rgba(15, 23, 42, 0.07)",
        card: "0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04)",
        nav: "0 -4px 16px rgba(15, 23, 42, 0.08)"
      },
      borderRadius: {
        "2.5xl": "1.125rem",
        "3xl": "1.5rem",
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};
