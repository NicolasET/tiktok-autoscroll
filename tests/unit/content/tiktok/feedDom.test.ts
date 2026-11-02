import { beforeEach, describe, expect, it } from 'vitest';
import { FeedDom } from '../../../../src/content/tiktok/feedDom';
import { cinemaFeed, legacyFeed, makePosts } from '../../../fixtures/tiktokDom';
import { byE2e, cardAt, markPlaying, mount, stubRect, videoAt } from '../../helpers';

describe('FeedDom', () => {
  let feed: FeedDom;

  beforeEach(() => {
    mount(cinemaFeed(makePosts('video', 'video', 'photo')));
    feed = new FeedDom(document);
  });

  it('knows when the page is a feed', () => {
    expect(feed.isFeedPage()).toBe(true);
    mount('<main>profile</main>');
    expect(feed.isFeedPage()).toBe(false);
  });

  it('identifies posts by their TikTok video id', () => {
    const item = feed.itemOf(videoAt(1));
    expect(item).toEqual({
      id: '7690000000000000001',
      videoId: '7690000000000000001',
      element: cardAt(1),
    });
  });

  it('falls back to the card id for posts without a player', () => {
    expect(feed.itemOf(cardAt(2))).toMatchObject({ id: 'card:media-card-2', videoId: null });
  });

  it('returns nothing for nodes outside the feed', () => {
    expect(feed.itemOf(document.body)).toBeNull();
    expect(feed.itemOf(document.createTextNode('x'))).toBeNull();
  });

  it('takes the playing video as the active item', () => {
    markPlaying(videoAt(1));
    expect(feed.activeItem()?.element).toBe(cardAt(1));
  });

  it('falls back to the card closest to the viewport center', () => {
    const height = window.innerHeight;
    stubRect(cardAt(0), { top: -height, bottom: 0, height });
    stubRect(cardAt(1), { top: 0, bottom: height, height });
    stubRect(cardAt(2), { top: height, bottom: 2 * height, height });
    expect(feed.activeItem()?.element).toBe(cardAt(1));
  });

  it('has no active item when no card is on screen', () => {
    expect(feed.activeItem()).toBeNull();
  });

  it('finds the item after another one', () => {
    const first = feed.itemOf(cardAt(0));
    const last = feed.itemOf(cardAt(2));
    if (!first || !last) throw new Error('missing items');
    expect(feed.itemAfter(first)?.element).toBe(cardAt(1));
    expect(feed.itemAfter(last)).toBeNull();
    expect(feed.itemAfter({ ...first, element: document.createElement('section') })).toBeNull();
  });

  it('tells video posts from photo posts', () => {
    const [video, photo] = [feed.itemOf(cardAt(0)), feed.itemOf(cardAt(2))];
    if (!video || !photo) throw new Error('missing items');
    expect(feed.hasVideo(video)).toBe(true);
    expect(feed.hasVideo(photo)).toBe(false);
  });

  it('finds the next button', () => {
    expect(feed.nextButton()).toBe(byE2e('feed-navigation-next'));
  });

  it('treats the media and the cinema overlay as the player', () => {
    expect(feed.isInsidePlayer(videoAt(0))).toBe(true);
    expect(feed.isInsidePlayer(byE2e('anchoring-description-layer'))).toBe(true);
    expect(feed.isInsidePlayer(document.body)).toBe(false);
    expect(feed.isInsidePlayer(null)).toBe(false);
  });

  it('only counts the legacy media card as the player', () => {
    mount(legacyFeed(makePosts('video')));
    expect(feed.isInsidePlayer(videoAt(0))).toBe(true);
    expect(feed.isInsidePlayer(byE2e('feed-navigation-next'))).toBe(false);
  });

  it('recognises the feed scroller', () => {
    expect(feed.isFeedScroller(document)).toBe(true);
    expect(feed.isFeedScroller(document.getElementById('column-list-container'))).toBe(true);
    expect(feed.isFeedScroller(byE2e('anchoring-chrome-host'))).toBe(false);
    expect(feed.isFeedScroller(null)).toBe(false);
  });

  it('detects an open comments panel', () => {
    document.body.insertAdjacentHTML('beforeend', '<input data-e2e="comment-input" />');
    expect(feed.commentsOpen()).toBe(false);
    stubRect(byE2e('comment-input'), { top: 100, bottom: 140, width: 300, height: 40 });
    expect(feed.commentsOpen()).toBe(true);
  });
});
