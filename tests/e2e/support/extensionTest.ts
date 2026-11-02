import { chromium, test as base, type BrowserContext, type Worker } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SettingsPatch } from '../../../src/shared/settings.ts';

const EXTENSION_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../dist');

interface ExtensionFixtures {
  readonly context: BrowserContext;
  readonly serviceWorker: Worker;
}

/** Each test gets a fresh Chromium profile with the built extension (dist/) loaded. */
export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixtures must destructure their deps.
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
    });
    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    const [running] = context.serviceWorkers();
    await use(running ?? (await context.waitForEvent('serviceworker')));
  },
});

/** Writes settings the way the popup does, once the install defaults are in place. */
export async function updateSettings(serviceWorker: Worker, patch: SettingsPatch): Promise<void> {
  await serviceWorker.evaluate(async (values) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const { watchedCount } = await chrome.storage.local.get('watchedCount');
      if (watchedCount !== undefined) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await chrome.storage.local.set(values);
  }, patch);
}

/** chrome-extension:// URL of an extension page, e.g. "popup/popup.html". */
export function extensionUrl(serviceWorker: Worker, page: string): string {
  return new URL(page, serviceWorker.url()).href;
}
