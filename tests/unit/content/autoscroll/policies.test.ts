import { describe, expect, it, vi } from 'vitest';
import { skipReasonFor } from '../../../../src/content/autoscroll/skipPolicy';
import { WatchCounter } from '../../../../src/content/autoscroll/watchCounter';

describe('skipReasonFor', () => {
  const all = { skipLive: true, skipAds: true, skipPaidPartnerships: true };
  const none = { ad: false, paidPartnership: false, live: false };

  it('prefers LIVE, then ad, then paid partnership', () => {
    expect(skipReasonFor({ ad: true, paidPartnership: true, live: true }, all)).toBe('live');
    expect(skipReasonFor({ ad: true, paidPartnership: true, live: false }, all)).toBe('ad');
    expect(skipReasonFor({ ...none, paidPartnership: true }, all)).toBe('paid-partnership');
  });

  it('respects each setting', () => {
    const off = { skipLive: false, skipAds: false, skipPaidPartnerships: false };
    expect(skipReasonFor({ ad: true, paidPartnership: true, live: true }, off)).toBeNull();
  });

  it('keeps regular posts', () => {
    expect(skipReasonFor(none, all)).toBeNull();
  });
});

describe('WatchCounter', () => {
  it('counts an item once it stayed long enough, and only once', () => {
    const onWatched = vi.fn();
    const counter = new WatchCounter(3000, onWatched);
    counter.observe('a', 2999);
    expect(onWatched).not.toHaveBeenCalled();
    counter.observe('a', 3000);
    counter.observe('a', 9000);
    expect(onWatched).toHaveBeenCalledOnce();
  });

  it('never counts skipped items', () => {
    const onWatched = vi.fn();
    const counter = new WatchCounter(3000, onWatched);
    counter.exclude('ad');
    counter.observe('ad', 5000);
    expect(onWatched).not.toHaveBeenCalled();
  });
});
