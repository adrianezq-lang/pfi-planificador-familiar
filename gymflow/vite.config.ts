import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['gymflow-icon.svg'],
      manifest: {
        name: 'GymFlow · Entrenamiento',
        short_name: 'GymFlow',
        description: 'Rutinas completas por niveles, sesiones guiadas y registro de progreso.',
        theme_color: '#101411',
        background_color: '#101411',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'es',
        categories: ['fitness', 'health', 'sports'],
        icons: [
          { src: 'gymflow-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,webp,svg,woff2,mp4,webm}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      devOptions: { enabled: true }
    })
  ]
})
