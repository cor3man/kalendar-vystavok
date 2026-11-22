// Icons of the installable app (SPEC 5.9). Run `npm run icons` after changing public/icon.svg;
// the generated PNGs in public/ are committed, so builds do not need the image toolchain.
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#E6007E' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#E6007E' } },
  },
  images: ['public/icon.svg'],
});
