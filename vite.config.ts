import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };
import { ru } from './src/i18n/ru.ts';

// SPEC 6.4: served from GitHub Pages under the repository name.
const base = '/kalendar-vystavok/';
const accent = '#E6007E';

export default defineConfig({
  base,
  plugins: [
    react(),
    // SPEC 2 #23, 5.9: installable, fully offline after the first visit, updates on request only.
    VitePWA({
      registerType: 'prompt',
      // Registered in src/pwa/registerSw.ts, wired to the update banner.
      injectRegister: false,
      // Own worker (src/sw.ts) bundled by Vite. The generateSW template embeds absolute import
      // paths in single quotes and breaks when the project path contains an apostrophe.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: base,
        name: ru.appName,
        short_name: ru.appName,
        description: ru.manifestDescription,
        lang: 'ru',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: accent,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        // Everything the app can load, including the lazy seed and jsPDF chunks and the fonts,
        // so creating a folder and exporting a PDF work offline too.
        globPatterns: ['**/*.{js,css,html,ttf,png,svg,ico,webmanifest}'],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
