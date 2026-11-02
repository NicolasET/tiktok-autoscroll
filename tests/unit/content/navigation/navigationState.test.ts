import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_NAVIGATION_TIMING as TIMING,
  NavigationState,
} from '../../../../src/content/navigation/navigationState';
import { manualClock, type ManualClock } from '../../helpers';

describe('NavigationState', () => {
  let clock: ManualClock;
  let state: NavigationState;

  beforeEach(() => {
    clock = manualClock();
    state = new NavigationState(clock, TIMING);
  });

  describe('our own advance', () => {
    it('is idle until an advance begins', () => {
      expect(state.isAdvancing()).toBe(false);
      state.beginAdvance('a');
      expect(state.isAdvancing()).toBe(true);
    });

    it('stays in flight for a guard period after the next item shows up', () => {
      state.beginAdvance('a');
      clock.advance(200);
      state.observeActive('a');
      state.observeActive('b');
      clock.advance(TIMING.arrivalGuardMs - 1);
      expect(state.isAdvancing()).toBe(true);
      clock.advance(1);
      expect(state.isAdvancing()).toBe(false);
    });

    it('only records the first arrival', () => {
      state.beginAdvance('a');
      state.observeActive('b');
      clock.advance(400);
      state.observeActive('c');
      clock.advance(TIMING.arrivalGuardMs - 400);
      expect(state.isAdvancing()).toBe(false);
    });

    it('ignores unknown active items', () => {
      state.beginAdvance('a');
      state.observeActive(null);
      clock.advance(TIMING.arrivalGuardMs);
      expect(state.isAdvancing()).toBe(true);
    });

    it('gives up when TikTok never moves', () => {
      state.beginAdvance('a');
      clock.advance(TIMING.moveTimeoutMs - 1);
      expect(state.isAdvancing()).toBe(true);
      clock.advance(1);
      expect(state.isAdvancing()).toBe(false);
    });
  });

  describe("the user's navigation", () => {
    it('counts as recent for a settle period', () => {
      expect(state.userNavigatedRecently()).toBe(false);
      state.recordUserNavigation('a');
      state.observeActive('b');
      clock.advance(TIMING.userSettleMs - 1);
      expect(state.userNavigatedRecently()).toBe(true);
      clock.advance(1);
      expect(state.userNavigatedRecently()).toBe(false);
    });

    it('stays pending while TikTok is slow to move', () => {
      state.recordUserNavigation('a');
      clock.advance(TIMING.userSettleMs + 500);
      expect(state.userNavigatedRecently()).toBe(true);
      state.observeActive('b');
      expect(state.userNavigatedRecently()).toBe(false);
    });

    it('stops waiting once the move timed out', () => {
      state.recordUserNavigation('a');
      clock.advance(TIMING.moveTimeoutMs);
      expect(state.userNavigatedRecently()).toBe(false);
    });

    it('falls back to the settle period when the starting item is unknown', () => {
      state.recordUserNavigation(null);
      state.observeActive('a');
      clock.advance(TIMING.userSettleMs);
      expect(state.userNavigatedRecently()).toBe(false);
    });

    it('does not count as our own advance', () => {
      state.recordUserNavigation('a');
      expect(state.isAdvancing()).toBe(false);
    });
  });

  it('treats the feed as scrolling right after a scroll event', () => {
    expect(state.isScrolling()).toBe(false);
    state.recordScroll();
    expect(state.isScrolling()).toBe(true);
    clock.advance(TIMING.scrollSettleMs);
    expect(state.isScrolling()).toBe(false);
  });
});
