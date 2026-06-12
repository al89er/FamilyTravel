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
      // Include all icon PNGs and the favicon in the precache
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "icon-16.png",
        "icon-32.png",
        "icon-192.png",
        "icon-512.png",
        "icon-maskable-192.png",
        "icon-maskable-512.png"
      ],
      manifest: {
        name: "Family Travel Companion",
        short_name: "FamilyTravel",
        description:
          "Plan family trips, itineraries, rooms, seats, documents, expenses, and emergency details.",
        theme_color: "#0f766e",
        background_color: "#fdfbf7",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}icon-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: `${base}icon-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: `${base}icon-maskable-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: `${base}icon-maskable-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,ico,json}"],
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
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "lucide-react"]
        }
      }
    }
  }
});
