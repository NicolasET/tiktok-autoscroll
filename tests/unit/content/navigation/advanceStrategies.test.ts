import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ArrowDownKeyStrategy,
  NextButtonStrategy,
  ScrollIntoViewStrategy,
} from '../../../../src/content/navigation/advanceStrategies';
import { FeedDom, type FeedItem } from '../../../../src/content/tiktok/feedDom';
import { cinemaFeed, makePosts } from '../../../fixtures/tiktokDom';
import { byE2e, cardAt, mount } from '../../helpers';

describe('advance strategies', () => {
  let feed: FeedDom;
  let first: FeedItem;
  let last: FeedItem;

  beforeEach(() => {
    mount(cinemaFeed(makePosts('video', 'video')));
    feed = new FeedDom(document);
    const items = [feed.itemOf(cardAt(0)), feed.itemOf(cardAt(1))];
    if (!items[0] || !items[1]) throw new Error('missing items');
    [first, last] = [items[0], items[1]];
  });

  describe('NextButtonStrategy', () => {
    it("clicks TikTok's next button", () => {
      const onClick = vi.fn();
      byE2e('feed-navigation-next').addEventListener('click', onClick);
      expect(new NextButtonStrategy(feed).tryAdvance()).toBe(true);
      expect(onClick).toHaveBeenCalledOnce();
    });

    it.each([
      [
        'disabled',
        (button: HTMLElement) => {
          button.setAttribute('disabled', '');
        },
      ],
      [
        'aria-disabled',
        (button: HTMLElement) => {
          button.setAttribute('aria-disabled', 'true');
        },
      ],
      [
        'missing',
        (button: HTMLElement) => {
          button.remove();
        },
      ],
    ])('skips a %s button', (_, arrange) => {
      arrange(byE2e('feed-navigation-next'));
      expect(new NextButtonStrategy(feed).tryAdvance()).toBe(false);
    });
  });

  describe('ScrollIntoViewStrategy', () => {
    it('scrolls the next card into view', () => {
      const scrollIntoView = vi.fn();
      cardAt(1).scrollIntoView = scrollIntoView;
      expect(new ScrollIntoViewStrategy(feed).tryAdvance(first)).toBe(true);
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });

    it('gives up on the last card', () => {
      expect(new ScrollIntoViewStrategy(feed).tryAdvance(last)).toBe(false);
    });
  });

  describe('ArrowDownKeyStrategy', () => {
    it('presses ArrowDown on the document', () => {
      const onKey = vi.fn((event: KeyboardEvent) => event.key);
      document.addEventListener('keydown', onKey);
      expect(new ArrowDownKeyStrategy(document).tryAdvance()).toBe(true);
      expect(onKey).toHaveReturnedWith('ArrowDown');
      document.removeEventListener('keydown', onKey);
    });
  });
});
