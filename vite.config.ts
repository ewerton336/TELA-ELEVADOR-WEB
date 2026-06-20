import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

const proxy = {
  "/api": {
    target: "http://localhost:3003",
    changeOrigin: true,
  },
  "/hub": {
    target: "http://localhost:3003",
    changeOrigin: true,
    ws: true,
  },
};

export default defineConfig({
  server: {
    host: "::",
    port: 3000,
    proxy,
  },
  preview: {
    host: "::",
    port: 4173,
    proxy,
  },
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: { enabled: false },
      manifest: {
        name: "Tela Elevador",
        short_name: "Tela Elevador",
        start_url: "/",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#0f172a",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/hub/, /^\/swagger/],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin &&
              url.pathname.startsWith("/api/") &&
              !url.pathname.startsWith("/api/admin") &&
              !url.pathname.includes("/auth/"),
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "elevador-api",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "elevador-imagens",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
