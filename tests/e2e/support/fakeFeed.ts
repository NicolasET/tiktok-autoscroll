import type { BrowserContext, Page } from '@playwright/test';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FakeFeedConfig } from '../../fixtures/tiktokDom.ts';
import type { FakeTikTokApi } from '../fake-tiktok/fakeTikTok.ts';

const SIMULATOR_ENTRY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fake-tiktok/fakeTikTok.ts',
);

let simulator: Promise<string> | undefined;

/** Bundles the fake feed once per worker. */
function simulatorScript(): Promise<string> {
  simulator ??= build({
    entryPoints: [SIMULATOR_ENTRY],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'chrome120',
  }).then((result) => result.outputFiles[0]?.text ?? '');
  return simulator;
}

function pageHtml(config: FakeFeedConfig, script: string): string {
  return `<!doctype html>
    <html lang="es">
      <head><meta charset="utf-8" /><title>TikTok</title></head>
      <body>
        <script>window.__FAKE_FEED_CONFIG__ = ${JSON.stringify(config)};</script>
        <script>${script}</script>
      </body>
    </html>`;
}

export interface OpenFeedOptions {
  /** Starts with TikTok's own autoscroll on (its localStorage flag). */
  readonly nativeAutoscroll?: boolean;
}

/** Serves the fake feed at tiktok.com, where the extension's content script runs. */
export async function openFeed(
  context: BrowserContext,
  config: FakeFeedConfig,
  options: OpenFeedOptions = {},
): Promise<Page> {
  const page = await context.newPage();
  const body = pageHtml(config, await simulatorScript());
  if (options.nativeAutoscroll) {
    await page.addInitScript(() => {
      localStorage.setItem('auto_scroll', '1');
    });
  }
  await page.route('https://www.tiktok.com/**', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body }),
  );
  await page.goto('https://www.tiktok.com/foryou');
  await page.locator('#tas-fab').waitFor();
  return page;
}

/** Calls a method of the fake feed inside the page. */
function callFake<M extends keyof FakeTikTokApi>(
  page: Page,
  method: M,
): Promise<ReturnType<FakeTikTokApi[M]>> {
  return page.evaluate((name) => {
    const api = window.fakeTikTok;
    if (!api) throw new Error('The fake feed is not mounted');
    return api[name]() as ReturnType<FakeTikTokApi[M]>;
  }, method);
}

export function activeIndex(page: Page): Promise<number> {
  return callFake(page, 'activeIndex');
}

export function syntheticNextClicks(page: Page): Promise<number> {
  return callFake(page, 'syntheticNextClicks');
}

export function endActiveVideo(page: Page): Promise<void> {
  return callFake(page, 'endActiveVideo');
}

export function nextButton(page: Page): ReturnType<Page['locator']> {
  return page.locator('[data-e2e="feed-navigation-next"]');
}
