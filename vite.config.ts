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
    // CORS headers nodig voor Google login popup
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },

    // Proxy naar Firebase Cloud Functions (local emulator)
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5001/habithero-73d98/us-central1",
        changeOrigin: true,
        secure: false,
        timeout: 120000,
        rewrite: (path) => {
          // Don't remove /api - the Cloud Function is named "api"
          console.log("[Vite Proxy]", path, "→", path);
          return path;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('[Vite Proxy Error]', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[Vite Proxy] Sending request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[Vite Proxy] Received response:', proxyRes.statusCode, 'for', req.url);
          });
        },
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
