import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.GITHUB_PAGES === "true" ? "/FamilyTravel/" : "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-192.svg", "pwa-512.svg"],
      manifest: {
        name: "Family Travel Companion",
        short_name: "FamilyTrip",
        description: "Plan, share, and follow family travel itineraries.",
        theme_color: "#0f766e",
        background_color: "#f8fafc",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}pwa-192.svg`, sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
          { src: `${base}pwa-512.svg`, sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-data",
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 }
            }
          }
        ]
      }
    })
  ]
});
