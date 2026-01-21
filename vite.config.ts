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
        // Functions emulator running on port 8020 (see firebase.json)
        target: "http://127.0.0.1:8020/habithero-73d98/us-central1",
        changeOrigin: true,
        secure: false,
        timeout: 120000,
        rewrite: (path) => {
          // Keep a single /api so the function name remains "api"
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

  // Build optimalisaties
  build: {
    // Code splitting configuratie
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split node_modules into separate chunks
          if (id.includes('node_modules')) {
            // Firebase SDK in separate chunk (large)
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            // React & React DOM in separate chunk
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            // React Router in separate chunk
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Framer Motion in separate chunk
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            // Axios in separate chunk
            if (id.includes('axios')) {
              return 'vendor-axios';
            }
            // All other node_modules
            return 'vendor';
          }
          
          // Split pages by route type for better caching
          if (id.includes('/pages/admin/')) {
            return 'pages-admin';
          }
          if (id.includes('/pages/teacher/')) {
            return 'pages-teacher';
          }
          if (id.includes('/pages/student/')) {
            return 'pages-student';
          }
          if (id.includes('/pages/')) {
            return 'pages-common';
          }
        },
      },
    },
    // Increase chunk size warning limit (we're splitting manually)
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging (optional, can disable for smaller builds)
    sourcemap: false,
    // Minification
    minify: 'esbuild',
    // Optimize chunk loading
    cssCodeSplit: true,
    // Report compressed size
    reportCompressedSize: true,
  },
});
