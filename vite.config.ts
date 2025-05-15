import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss()],
  esbuild: {
    target: "esnext", // or 'edge89', 'chrome89' — something that supports top-level await
  },
});
