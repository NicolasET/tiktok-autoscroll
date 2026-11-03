import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoscrollController } from '../../../../src/content/autoscroll/autoscrollController';
import type { AdvanceOutcome } from '../../../../src/content/navigation/feedNavigator';
import type { FeedItem } from '../../../../src/content/tiktok/feedDom';
import type { ItemTraits } from '../../../../src/content/tiktok/traits';
import { DEFAULT_SETTINGS, type Settings } from '../../../../src/shared/settings';

const NONE: ItemTraits = { ad: false, paidPartnership: false, live: false };
const ENDED_GRACE_MS = 300;
const SKIP_DELAY_MS = 700;
const RETRY_AFTER_MS = 2500;

function item(id: string): FeedItem {
  return { id, videoId: id, element: document.createElement('section') };
}

/** The controller wired to in-memory fakes that each test can steer. */
class Harness {
  settings: Settings = { ...DEFAULT_SETTINGS, enabled: true };
  onFeed = true;
  active: FeedItem = item('a');
  readonly photos = new Set<string>();
  readonly traits = new Map<string, ItemTraits | null>();
  interacting = false;
  native = false;
  outcome: AdvanceOutcome = 'advanced';

  readonly advanceFrom = vi.fn<(itemId: string, reason: string) => AdvanceOutcome>(
    () => this.outcome,
  );
  readonly observeActive = vi.fn();
  readonly observe = vi.fn();
  readonly exclude = vi.fn();

  readonly controller = new AutoscrollController({
    settings: () => this.settings,
    feed: {
      isFeedPage: () => this.onFeed,
      activeItem: () => this.active,
      hasVideo: (feedItem) => !this.photos.has(feedItem.id),
    },
    traits: {
      read: (feedItem) => {
        const traits = this.traits.get(feedItem.id);
        return traits === undefined ? NONE : traits;
      },
    },
    navigator: { advanceFrom: this.advanceFrom },
    navigation: { observeActive: this.observeActive },
    interaction: { isInteracting: () => this.interacting },
    native: { isActive: () => this.native },
    counter: { observe: this.observe, exclude: this.exclude },
    clock: { now: () => Date.now() },
    log: vi.fn(),
  });

  get mode(): string {
    return this.controller.status().mode;
  }

  /** Lets time pass, ticking like the content script does. */
  wait(ms: number): void {
    vi.advanceTimersByTime(ms);
    this.controller.tick();
  }

  videoEnds(): void {
    this.controller.onFinished(this.active, 'ended');
  }
}

describe('AutoscrollController', () => {
  let h: Harness;

  beforeEach(() => {
    vi.useFakeTimers();
    h = new Harness();
    h.controller.tick();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when a video ends', () => {
    it('advances after a short grace period', () => {
      h.videoEnds();
      vi.advanceTimersByTime(ENDED_GRACE_MS - 1);
      expect(h.advanceFrom).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(h.advanceFrom).toHaveBeenCalledExactlyOnceWith('a', 'ended');
    });

    it('waits while the user interacts, then advances', () => {
      h.interacting = true;
      h.videoEnds();
      h.wait(ENDED_GRACE_MS);
      expect(h.advanceFrom).not.toHaveBeenCalled();
      expect(h.mode).toBe('waiting');

      h.interacting = false;
      h.wait(400);
      expect(h.advanceFrom).toHaveBeenCalledOnce();
      expect(h.mode).toBe('on');
    });

    it('does not wait for the user when "pause on interact" is off', () => {
      h.settings = { ...h.settings, pauseOnInteract: false };
      h.interacting = true;
      h.videoEnds();
      vi.advanceTimersByTime(ENDED_GRACE_MS);
      expect(h.advanceFrom).toHaveBeenCalledOnce();
    });

    it('retries while the feed is busy', () => {
      h.outcome = 'busy';
      h.videoEnds();
      vi.advanceTimersByTime(ENDED_GRACE_MS);
      h.outcome = 'advanced';
      h.wait(400);
      expect(h.advanceFrom).toHaveBeenCalledTimes(2);
      h.wait(400);
      expect(h.advanceFrom).toHaveBeenCalledTimes(2);
    });

    it('lets the user win when they navigate first', () => {
      h.videoEnds();
      h.controller.onUserNavigation();
      h.wait(ENDED_GRACE_MS);
      expect(h.advanceFrom).not.toHaveBeenCalled();
    });

    it('handles a video that ends before the first tick saw it', () => {
      h.active = item('b');
      h.videoEnds();
      vi.advanceTimersByTime(ENDED_GRACE_MS);
      expect(h.advanceFrom).toHaveBeenCalledExactlyOnceWith('b', 'ended');
    });

    it('forgets the request once the feed moved on', () => {
      h.videoEnds();
      h.active = item('b');
      h.wait(ENDED_GRACE_MS);
      expect(h.advanceFrom).not.toHaveBeenCalled();
    });
  });

  describe('skipping', () => {
    it.each([
      ['ads', { ...NONE, ad: true }, 'ad'],
      ['LIVEs', { ...NONE, live: true }, 'live'],
    ])(
      'skips %s once they have been on screen briefly, even while interacting',
      (_, traits, reason) => {
        h.traits.set('a', traits);
        h.interacting = true;
        h.wait(SKIP_DELAY_MS - 1);
        expect(h.advanceFrom).not.toHaveBeenCalled();
        h.wait(1);
        expect(h.advanceFrom).toHaveBeenCalledExactlyOnceWith('a', reason);
        expect(h.exclude).toHaveBeenCalledWith('a');
      },
    );

    it.each([
      ['ads', 'skipAds', { ...NONE, ad: true }],
      ['LIVEs', 'skipLive', { ...NONE, live: true }],
    ] as const)('leaves %s alone when %s is off', (_, setting, traits) => {
      h.settings = { ...h.settings, [setting]: false };
      h.traits.set('a', traits);
      h.wait(SKIP_DELAY_MS);
      expect(h.advanceFrom).not.toHaveBeenCalled();
    });

    it('only skips paid partnerships when asked to', () => {
      h.traits.set('a', { ...NONE, paidPartnership: true });
      h.wait(SKIP_DELAY_MS);
      expect(h.advanceFrom).not.toHaveBeenCalled();

      h.settings = { ...h.settings, skipPaidPartnerships: true };
      h.wait(400);
      expect(h.advanceFrom).toHaveBeenCalledExactlyOnceWith('a', 'paid-partnership');
    });

    it('retries if the feed is still on the same item a while later', () => {
      h.traits.set('a', { ...NONE, ad: true });
      h.wait(SKIP_DELAY_MS);
      h.wait(RETRY_AFTER_MS - 1);
      expect(h.advanceFrom).toHaveBeenCalledOnce();
      h.wait(1);
      expect(h.advanceFrom).toHaveBeenCalledTimes(2);
    });

    it('waits until the labels can be read', () => {
      h.traits.set('a', null);
      h.wait(SKIP_DELAY_MS);
      expect(h.advanceFrom).not.toHaveBeenCalled();
    });

    it('takes over a pending "ended" advance', () => {
      h.interacting = true;
      h.videoEnds();
      h.traits.set('a', { ...NONE, ad: true });
      h.wait(SKIP_DELAY_MS);
      expect(h.advanceFrom).toHaveBeenCalledExactlyOnceWith('a', 'ad');
    });

    it('is not replaced by an "ended" advance', () => {
      h.outcome = 'busy';
      h.traits.set('a', { ...NONE, ad: true });
      h.wait(SKIP_DELAY_MS);
      h.videoEnds();
      h.outcome = 'advanced';
      h.wait(ENDED_GRACE_MS);
      expect(h.advanceFrom).toHaveBeenLastCalledWith('a', 'ad');
    });
  });

  describe('photo posts', () => {
    it('advance after the configured time', () => {
      h.photos.add('a');
      h.wait(DEFAULT_SETTINGS.photoSeconds * 1000 - 1);
      expect(h.advanceFrom).not.toHaveBeenCalled();
      h.wait(1);
      expect(h.advanceFrom).toHaveBeenCalledExactlyOnceWith('a', 'photo');
    });

    it('never advance when the timer is 0', () => {
      h.settings = { ...h.settings, photoSeconds: 0 };
      h.photos.add('a');
      h.wait(60_000);
      expect(h.advanceFrom).not.toHaveBeenCalled();
    });
  });

  describe("with TikTok's own autoscroll on", () => {
    beforeEach(() => {
      h.native = true;
    });

    it('reports the native mode', () => {
      expect(h.mode).toBe('native');
    });

    it('neither advances nor skips', () => {
      h.videoEnds();
      h.traits.set('a', { ...NONE, ad: true });
      h.photos.add('a');
      h.wait(60_000);
      expect(h.advanceFrom).not.toHaveBeenCalled();
    });

    it('drops an advance requested just before it was turned on', () => {
      h.native = false;
      h.videoEnds();
      h.native = true;
      vi.advanceTimersByTime(ENDED_GRACE_MS);
      expect(h.advanceFrom).not.toHaveBeenCalled();
    });
  });

  describe('when turned off', () => {
    beforeEach(() => {
      h.settings = { ...h.settings, enabled: false };
    });

    it('reports the off mode, even if TikTok autoscroll is on', () => {
      h.native = true;
      expect(h.mode).toBe('off');
    });

    it('ignores ended videos and ads', () => {
      h.videoEnds();
      h.traits.set('a', { ...NONE, ad: true });
      h.wait(SKIP_DELAY_MS);
      expect(h.advanceFrom).not.toHaveBeenCalled();
    });
  });

  it('reports watch time per item', () => {
    h.wait(3000);
    expect(h.observe).toHaveBeenLastCalledWith('a', 3000);
    h.active = item('b');
    h.wait(400);
    expect(h.observe).toHaveBeenLastCalledWith('b', 0);
  });

  it('tells the navigation state which item is active', () => {
    expect(h.observeActive).toHaveBeenLastCalledWith('a');
    h.active = item('b');
    h.controller.onPlay();
    expect(h.observeActive).toHaveBeenLastCalledWith('b');
  });

  it('does nothing off the feed', () => {
    h.onFeed = false;
    h.observe.mockClear();
    h.wait(400);
    expect(h.observe).not.toHaveBeenCalled();
    expect(h.controller.status().onFeed).toBe(false);
  });

  it('publishes its status to subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = h.controller.onStatus(listener);
    h.controller.refresh();
    expect(listener).toHaveBeenLastCalledWith({ mode: 'on', onFeed: true, watchedCount: 0 });
    unsubscribe();
    h.controller.tick();
    expect(listener).toHaveBeenCalledOnce();
  });

  it('cancels the pending advance on demand', () => {
    h.videoEnds();
    h.controller.cancel();
    h.wait(ENDED_GRACE_MS);
    expect(h.advanceFrom).not.toHaveBeenCalled();
  });
});
