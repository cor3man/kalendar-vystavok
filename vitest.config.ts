import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/layout/**', 'src/storage/**'],
      exclude: ['src/storage/fsAccessStorage.ts'],
      // SPEC 7.2: the 90 % line threshold is enforced from M1, when these folders contain code.
    },
  },
});
