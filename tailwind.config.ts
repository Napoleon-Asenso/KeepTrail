import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary-color)",
          foreground: "var(--on-primary-color)",
          container: "var(--primary-container-color)",
          "on-container": "var(--on-primary-container-color)",
        },
        secondary: {
          DEFAULT: "var(--secondary-color)",
          foreground: "var(--on-secondary-color)",
          container: "var(--secondary-container-color)",
          "on-container": "var(--on-secondary-container-color)",
        },
        tertiary: {
          DEFAULT: "var(--tertiary-color)",
          foreground: "var(--on-tertiary-color)",
          container: "var(--tertiary-container-color)",
          "on-container": "var(--on-tertiary-container-color)",
        },
        error: {
          DEFAULT: "var(--error-color)",
          foreground: "var(--on-error-color)",
          container: "var(--error-container-color)",
          "on-container": "var(--on-error-container-color)",
        },
        surface: {
          DEFAULT: "var(--surface-color)",
          foreground: "var(--on-surface-color)",
          dim: "var(--surface-dim-color)",
          bright: "var(--surface-bright-color)",
          variant: "var(--surface-variant-color)",
          "on-variant": "var(--on-surface-variant-color)",
          container: "var(--surface-container-color)",
          "container-lowest": "var(--surface-container-lowest-color)",
          "container-low": "var(--surface-container-low-color)",
          "container-high": "var(--surface-container-high-color)",
          "container-highest": "var(--surface-container-highest-color)",
        },
        outline: {
          DEFAULT: "var(--outline-color)",
          variant: "var(--outline-variant-color)",
        },
        inverse: {
          surface: "var(--inverse-surface-color)",
          "on-surface": "var(--inverse-on-surface-color)",
          primary: "var(--inverse-primary-color)",
        },
      },
      fontFamily: {
        sans: ["var(--font-family-sans)", "sans-serif"],
        display: ["var(--font-family-display)", "sans-serif"],
        mono: ["var(--font-family-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
