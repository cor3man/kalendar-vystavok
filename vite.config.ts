import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

// SPEC 6.4: served from GitHub Pages under the repository name.
export default defineConfig({
  base: '/kalendar-vystavok/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
