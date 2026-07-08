import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 }
            }
          }
        ]
      },
      manifest: {
        name: 'Fitness-Tracker',
        short_name: 'Fitness',
        description: 'Tägliche Sporteinheit, Gym-Rotation und Trainingsverlauf',
        theme_color: '#10b981',
        background_color: '#f3faf6',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
