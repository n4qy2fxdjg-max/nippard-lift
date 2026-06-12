import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' so a new version waits for an explicit tap (the in-app Update
      // banner) instead of silently swapping under the user.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png', 'pwa-512-maskable.png', 'apple-touch-icon.png', 'push-sw.js'],
      workbox: {
        // Pull in the push/notificationclick handlers (background reminders)
        importScripts: ['push-sw.js'],
        // Cache the Google Fonts stylesheet + woff2 files so the brand
        // typography (DM Serif Display / Outfit) survives offline launches
        // instead of silently falling back to Georgia/system sans.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Lift',
        short_name: 'Lift',
        description: 'Science-based progressive overload tracker',
        theme_color: '#0C0C0C',
        background_color: '#0C0C0C',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
