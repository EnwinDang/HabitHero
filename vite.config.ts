import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],

  server: {
    // Nodig voor Google login popup
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },

    // Proxy naar Firebase Cloud Functions
    proxy: {
      "/api": {
        // ⚠️ BELANGRIJK: function name MOET hier staan
        target: "https://us-central1-habithero-73d98.cloudfunctions.net",
        changeOrigin: true,
        secure: true,
      },
    },
  },

  // Alias is optioneel, maar handig
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
