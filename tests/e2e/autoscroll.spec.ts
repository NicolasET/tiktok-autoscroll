import { expect, type Page } from '@playwright/test';
import {
  makePosts,
  type FakeFeedConfig,
  type FeedLayout,
  type PostKind,
} from '../fixtures/tiktokDom.ts';
import { extensionUrl, test, updateSettings } from './support/extensionTest.ts';
import {
  activeIndex,
  endActiveVideo,
  nextButton,
  openFeed,
  syntheticNextClicks,
} from './support/fakeFeed.ts';

/** TikTok's usual move time. Some tests slow it down, as TikTok does while it loads a video. */
const TRANSITION_MS = 220;
/** Longer than any delay of the extension: a move that hasn't happened by then won't. */
const SETTLE_MS = 2000;

function feed(layout: FeedLayout, kinds: PostKind[], transitionMs = TRANSITION_MS): FakeFeedConfig {
  return { layout, posts: makePosts(...kinds), transitionMs, overlayLagMs: 80 };
}

/** The feed reaches `index` and stays there: nothing moves it a second time. */
async function expectToSettleOn(page: Page, index: number): Promise<void> {
  await expect.poll(() => activeIndex(page)).toBe(index);
  await page.waitForTimeout(SETTLE_MS);
  expect(await activeIndex(page)).toBe(index);
}

for (const layout of ['cinema', 'legacy'] as const) {
  test.describe(`${layout} layout`, () => {
    test.beforeEach(async ({ serviceWorker }) => {
      // Playwright's clicks hover the player, which would otherwise hold "ended" advances back.
      await updateSettings(serviceWorker, { enabled: true, pauseOnInteract: false });
    });

    test('moves on when a video ends', async ({ context }) => {
      const page = await openFeed(context, feed(layout, ['video', 'video', 'video']));
      await endActiveVideo(page);
      await expectToSettleOn(page, 1);
    });

    test('skips ads', async ({ context }) => {
      const page = await openFeed(context, feed(layout, ['ad', 'video', 'video']));
      await expectToSettleOn(page, 1);
    });

    test('skips consecutive ads', async ({ context }) => {
      const page = await openFeed(context, feed(layout, ['ad', 'ad', 'video', 'video']));
      await expectToSettleOn(page, 2);
    });

    test('skips LIVEs', async ({ context }) => {
      const page = await openFeed(context, feed(layout, ['live', 'video', 'video']));
      await expectToSettleOn(page, 1);
    });

    test('keeps paid partnerships unless asked to skip them', async ({
      context,
      serviceWorker,
    }) => {
      const page = await openFeed(context, feed(layout, ['paid-partnership', 'video', 'video']));
      await page.waitForTimeout(SETTLE_MS);
      expect(await activeIndex(page)).toBe(0);

      await updateSettings(serviceWorker, { skipPaidPartnerships: true });
      await expectToSettleOn(page, 1);
    });

    test("stands aside while TikTok's own autoscroll is on", async ({ context }) => {
      const page = await openFeed(context, feed(layout, ['ad', 'video', 'video']), {
        nativeAutoscroll: true,
      });
      await expect(page.locator('#tas-fab')).toContainText('TikTok auto');
      await page.waitForTimeout(SETTLE_MS);
      expect(await activeIndex(page)).toBe(0);

      await endActiveVideo(page);
      await expectToSettleOn(page, 1);
      expect(await syntheticNextClicks(page)).toBe(0);
    });

    test('a manual "next" right as a video ends moves one video', async ({ context }) => {
      const page = await openFeed(context, feed(layout, ['video', 'video', 'video'], 600));
      await endActiveVideo(page);
      await nextButton(page).click();
      await expectToSettleOn(page, 1);
      expect(await syntheticNextClicks(page)).toBe(0);
    });

    test('a manual "next" while the extension advances moves one video', async ({ context }) => {
      const page = await openFeed(context, feed(layout, ['video', 'video', 'video']));
      await endActiveVideo(page);
      await expect.poll(() => syntheticNextClicks(page)).toBe(1);
      await nextButton(page).click();
      await expectToSettleOn(page, 1);
    });

    test('a manual "next" on an ad moves one video', async ({ context }) => {
      const page = await openFeed(context, feed(layout, ['ad', 'video', 'video'], 1500));
      await nextButton(page).click();
      await expectToSettleOn(page, 1);
      expect(await syntheticNextClicks(page)).toBe(0);
    });
  });
}

test.describe('popup', () => {
  test('saves the paid partnership toggle', async ({ context, serviceWorker }) => {
    const popup = await context.newPage();
    await popup.goto(extensionUrl(serviceWorker, 'popup/popup.html'));
    await expect(popup.locator('#skipPaidPartnerships')).not.toBeChecked();

    await popup.locator('label', { hasText: 'Saltar colaboraciones de pago' }).click();
    await expect
      .poll(() =>
        serviceWorker.evaluate(async () => {
          const stored = await chrome.storage.local.get('skipPaidPartnerships');
          return stored.skipPaidPartnerships;
        }),
      )
      .toBe(true);
  });
});
