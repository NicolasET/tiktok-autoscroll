import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'https://www.tiktok.com/foryou' } },
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Composition roots only wire modules together; the e2e suite exercises them.
      exclude: ['src/**/main.ts', 'src/content/debugHandle.ts'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
