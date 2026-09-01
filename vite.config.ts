/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // Don't let the SPA navigation fallback serve index.html for server
        // routes — otherwise the OAuth callback (a top-level navigation to
        // /api/gmail/callback) is hijacked by the service worker and the app
        // shell renders instead of the redirect running. Let /api hit the network.
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Nomad Help Desk',
        short_name: 'Nomad',
        description: 'Schengen 90/180 day calculator for US travelers.',
        theme_color: '#17263B',
        background_color: '#131F2E',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icons/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
