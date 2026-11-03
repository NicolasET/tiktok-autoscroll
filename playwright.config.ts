import { defineConfig } from '@playwright/test';

const isCI = process.env.CI !== undefined;

/** e2e tests load the built extension (run `pnpm build` first, or use `pnpm test:e2e`). */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure' },
});
