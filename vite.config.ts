import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.VITE_BASE_PATH || "/";
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/*.png", "icons/*.svg", "images/*.jpg"],
      manifest: {
        id: base,
        name: "今天吃什么",
        short_name: "今天吃什么",
        lang: "zh-CN",
        description: "把喜欢的菜谱，变成好好吃饭的日常。",
        theme_color: "#42624b",
        background_color: "#f8f7f2",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,jpg,webmanifest}"],
        cleanupOutdatedCaches: true,
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/\/api\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
});
