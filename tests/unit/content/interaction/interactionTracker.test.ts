import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractionTracker } from '../../../../src/content/interaction/interactionTracker';
import { FeedDom } from '../../../../src/content/tiktok/feedDom';
import { cinemaFeed, makePosts } from '../../../fixtures/tiktokDom';
import { manualClock, mount, videoAt, type ManualClock } from '../../helpers';

const WINDOW_MS = 2500;

describe('InteractionTracker', () => {
  let clock: ManualClock;
  let feed: FeedDom;
  let tracker: InteractionTracker;

  beforeEach(() => {
    mount(cinemaFeed(makePosts('video')));
    clock = manualClock();
    feed = new FeedDom(document);
    tracker = new InteractionTracker(document, feed, clock, WINDOW_MS);
  });

  it('counts recent mouse moves over the player', () => {
    const stop = tracker.start();
    document.body.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(tracker.isInteracting()).toBe(false);

    videoAt(0).dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(tracker.isInteracting()).toBe(true);
    clock.advance(WINDOW_MS);
    expect(tracker.isInteracting()).toBe(false);

    stop();
    videoAt(0).dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(tracker.isInteracting()).toBe(false);
  });

  it('counts an open comments panel', () => {
    vi.spyOn(feed, 'commentsOpen').mockReturnValue(true);
    expect(tracker.isInteracting()).toBe(true);
  });

  it('counts typing', () => {
    document.body.insertAdjacentHTML('beforeend', '<textarea id="comment"></textarea>');
    document.getElementById('comment')?.focus();
    expect(tracker.isInteracting()).toBe(true);
  });
});
