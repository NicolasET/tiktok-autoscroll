import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  DEFAULT_NAVIGATION_TIMING,
  NavigationState,
} from '../../../../src/content/navigation/navigationState';
import {
  UserNavigationMonitor,
  type UserNavigationListener,
} from '../../../../src/content/navigation/userNavigationMonitor';
import { FeedDom } from '../../../../src/content/tiktok/feedDom';
import { cinemaFeed, makePosts } from '../../../fixtures/tiktokDom';
import { byE2e, manualClock, mount, videoAt } from '../../helpers';

describe('UserNavigationMonitor', () => {
  let state: NavigationState;
  let onNavigate: Mock<UserNavigationListener>;
  let stop: () => void;

  /** jsdom events are never trusted, so these tests treat every event as the user's. */
  function start(isUserEvent: (event: Event) => boolean = () => true): () => void {
    const monitor = new UserNavigationMonitor(
      window,
      new FeedDom(document),
      state,
      vi.fn(),
      isUserEvent,
    );
    onNavigate = vi.fn<UserNavigationListener>();
    const unsubscribe = monitor.onNavigate(onNavigate);
    stop = monitor.start();
    return unsubscribe;
  }

  beforeEach(() => {
    mount(cinemaFeed(makePosts('video', 'video')));
    state = new NavigationState(manualClock(), DEFAULT_NAVIGATION_TIMING);
  });

  afterEach(() => {
    stop();
  });

  it.each([
    ['next', 'feed-navigation-next', 'forward'],
    ['previous', 'feed-navigation-prev', 'backward'],
  ])('records clicks on the %s arrow', (_, e2e, direction) => {
    start();
    byE2e(e2e).click();
    expect(onNavigate).toHaveBeenCalledWith(direction);
    expect(state.userNavigatedRecently()).toBe(true);
  });

  it('ignores other clicks', () => {
    start();
    videoAt(0).click();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('ignores synthetic events (our own advances)', () => {
    start((event) => event.isTrusted);
    byE2e('feed-navigation-next').click();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('swallows a manual "next" while our advance is in flight', () => {
    start();
    state.beginAdvance('7690000000000000000');
    const tiktokHandler = vi.fn();
    const next = byE2e('feed-navigation-next');
    next.addEventListener('click', tiktokHandler);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    next.dispatchEvent(event);

    expect(tiktokHandler).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('lets "previous" through while our advance is in flight', () => {
    start();
    state.beginAdvance('7690000000000000000');
    byE2e('feed-navigation-prev').click();
    expect(onNavigate).toHaveBeenCalledWith('backward');
  });

  it.each([
    ['ArrowDown', 'forward'],
    ['PageDown', 'forward'],
    ['ArrowUp', 'backward'],
    ['PageUp', 'backward'],
  ])('records the %s key', (key, direction) => {
    start();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    expect(onNavigate).toHaveBeenCalledWith(direction);
  });

  it.each([
    ['other keys', { key: 'a' }],
    ['shortcuts with modifiers', { key: 'ArrowDown', ctrlKey: true }],
  ])('ignores %s', (_, init) => {
    start();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { ...init, bubbles: true }));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('ignores arrow keys while typing', () => {
    start();
    document.body.insertAdjacentHTML('beforeend', '<input id="search" />');
    const input = document.getElementById('search');
    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('records wheel scrolls over the player only', () => {
    start();
    document.body.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }));
    expect(onNavigate).not.toHaveBeenCalled();
    videoAt(0).dispatchEvent(new WheelEvent('wheel', { deltaY: 0, bubbles: true }));
    expect(onNavigate).not.toHaveBeenCalled();
    videoAt(0).dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
    expect(onNavigate).toHaveBeenCalledWith('backward');
  });

  it('records touches on the player', () => {
    start();
    videoAt(0).dispatchEvent(new Event('touchstart', { bubbles: true }));
    expect(onNavigate).toHaveBeenCalledWith('unknown');
  });

  it('marks the feed as scrolling when its scroller scrolls', () => {
    start();
    byE2e('anchoring-chrome-host').dispatchEvent(new Event('scroll'));
    expect(state.isScrolling()).toBe(false);
    document.getElementById('column-list-container')?.dispatchEvent(new Event('scroll'));
    expect(state.isScrolling()).toBe(true);
  });

  it('stops listening', () => {
    start();
    stop();
    byE2e('feed-navigation-next').click();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(state.userNavigatedRecently()).toBe(false);
  });

  it('lets listeners unsubscribe', () => {
    const unsubscribe = start();
    unsubscribe();
    byE2e('feed-navigation-next').click();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(state.userNavigatedRecently()).toBe(true);
  });
});
