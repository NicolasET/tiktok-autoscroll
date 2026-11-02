import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { FeedNavigator } from '../../../../src/content/navigation/feedNavigator';
import {
  DEFAULT_NAVIGATION_TIMING,
  NavigationState,
} from '../../../../src/content/navigation/navigationState';
import { FeedDom, type FeedItem } from '../../../../src/content/tiktok/feedDom';
import { cinemaFeed, makePosts } from '../../../fixtures/tiktokDom';
import { manualClock, markPlaying, mount, videoAt } from '../../helpers';

const FIRST_ID = '7690000000000000000';

interface FakeStrategy {
  readonly name: string;
  readonly tryAdvance: Mock<(from: FeedItem) => boolean>;
}

function strategy(name: string, works: boolean): FakeStrategy {
  return { name, tryAdvance: vi.fn(() => works) };
}

describe('FeedNavigator', () => {
  let state: NavigationState;

  beforeEach(() => {
    mount(cinemaFeed(makePosts('video', 'video')));
    markPlaying(videoAt(0));
    state = new NavigationState(manualClock(), DEFAULT_NAVIGATION_TIMING);
  });

  function navigator(...strategies: FakeStrategy[]): FeedNavigator {
    return new FeedNavigator(new FeedDom(document), state, strategies, vi.fn());
  }

  it('advances with the first strategy that works', () => {
    const unavailable = strategy('button', false);
    const scroll = strategy('scroll', true);
    const key = strategy('key', true);
    expect(navigator(unavailable, scroll, key).advanceFrom(FIRST_ID, 'ended')).toBe('advanced');
    expect(unavailable.tryAdvance).toHaveBeenCalledOnce();
    expect(scroll.tryAdvance).toHaveBeenCalledOnce();
    expect(key.tryAdvance).not.toHaveBeenCalled();
    expect(state.isAdvancing()).toBe(true);
  });

  it('does nothing once the feed left the item (no double skip)', () => {
    const next = strategy('button', true);
    expect(navigator(next).advanceFrom('some-other-item', 'ended')).toBe('stale');
    expect(next.tryAdvance).not.toHaveBeenCalled();
  });

  it.each([
    [
      'its own advance is in flight',
      (s: NavigationState) => {
        s.beginAdvance(FIRST_ID);
      },
    ],
    [
      'the user just navigated',
      (s: NavigationState) => {
        s.recordUserNavigation(FIRST_ID);
      },
    ],
    [
      'the feed is scrolling',
      (s: NavigationState) => {
        s.recordScroll();
      },
    ],
  ])('waits while %s', (_, arrange) => {
    arrange(state);
    const next = strategy('button', true);
    expect(navigator(next).advanceFrom(FIRST_ID, 'ended')).toBe('busy');
    expect(next.tryAdvance).not.toHaveBeenCalled();
  });

  it('reports busy when no strategy can advance', () => {
    expect(navigator(strategy('button', false)).advanceFrom(FIRST_ID, 'ended')).toBe('busy');
    expect(state.isAdvancing()).toBe(false);
  });
});
