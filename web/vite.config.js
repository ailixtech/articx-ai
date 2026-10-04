import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022", // top-level await in src/lib/firebase.js
    sourcemap: false, // don't publish source maps
    assetsInlineLimit: 0, // never inline assets as data: URLs; the CSP only allows fonts from 'self'
    chunkSizeWarningLimit: 700, // the chat chunk carries the Firebase SDK; it loads only on /chat
  },
  server: {
    port: 5173,
    // The Firebase web config (/__/firebase/init.json) comes from the deployed dev site,
    // so `npm run dev` works on its own.
    proxy: {
      "/__": { target: "https://articx-ai-dev.web.app", changeOrigin: true },
      "/api": { target: "https://articx-ai-dev.web.app", changeOrigin: true },
    },
  },
});
