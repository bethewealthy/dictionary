import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// 오프라인 완전 동작이 요구사항이다 (ADR-003). 서비스 워커가 앱 셸과
// 번들된 사전 데이터를 캐시한다. 콘텐츠 갱신은 contentVersion 기준(ADR-008).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '초등 영한사전',
        short_name: '영한사전',
        description: '초등학생이 혼자 찾아보고 익히는 영한사전',
        lang: 'ko',
        theme_color: '#1b4b8f',
        background_color: '#f3f5f1',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
});
