import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // Show console output of passing tests too: the performance test logs its measured times.
    silent: false,
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/layout/**', 'src/storage/**'],
      exclude: ['src/storage/fsAccessStorage.ts'],
      // SPEC 7.2: at least 90 % of lines covered in domain, layout and storage.
      thresholds: { lines: 90 },
    },
  },
});
