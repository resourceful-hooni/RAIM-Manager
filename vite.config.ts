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
        includeAssets: ['manual.png', 'pop.png', 'logo.png'],
        workbox: {
          globIgnores: ['**/*.xlsx', '**/sheets/**/*'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
          clientsClaim: true,
          skipWaiting: true,
          navigateFallbackDenylist: [/\.xlsx$/, /^\/sheets/, /^\/api/]
        },
        manifest: {
          name: '방문객 카운터',
          short_name: '카운터',
          description: '실시간 방문객 카운팅 및 통계 대시보드',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'https://science.seoul.go.kr/RAIM/resource/www/img/favicon32.png',
              sizes: '32x32',
              type: 'image/png'
            }
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
