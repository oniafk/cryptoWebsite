/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        secondary: "var(--color-secondary)",
        "secondary-hover": "var(--color-secondary-hover)",
        "bg-base": "var(--color-bg-base)",
        "bg-surface": "var(--color-bg-surface)",
        "text-dark": "var(--color-text-dark)",
        "text-light": "var(--color-text-light)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
      boxShadow: {
        DEFAULT: "var(--shadow)",
      },
      spacing: {
        DEFAULT: "var(--spacing)",
      },
    },
  },
};
