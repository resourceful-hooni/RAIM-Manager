import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pop.svg', 'raim_logo.png', 'logo_wa.png', 'footer_logo.png', 'app-icon.svg', 'favicon32.png', 'apple-touch-icon.png'],
        workbox: {
          globIgnores: ['**/*.xlsx', '**/sheets/**/*'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
          clientsClaim: true,
          skipWaiting: true,
          navigateFallbackDenylist: [/\.xlsx$/, /^\/sheets/, /^\/api/]
        },
        manifest: {
          name: 'RAIM 방문자 카운터',
          short_name: 'RAIM 카운터',
          description: '서울로봇인공지능과학관 실시간 방문객 카운팅 및 통계 대시보드',
          lang: 'ko',
          background_color: '#f8fafc',
          theme_color: '#00448B',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 4000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
