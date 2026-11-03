import { isEditable } from '../editable';
import type { Logger } from '../log';
import type { FeedDom } from '../tiktok/feedDom';
import { SELECTORS } from '../tiktok/selectors';
import type { NavigationState } from './navigationState';

export type NavigationDirection = 'forward' | 'backward' | 'unknown';
export type UserNavigationListener = (direction: NavigationDirection) => void;

const FORWARD_KEYS = new Set(['ArrowDown', 'PageDown']);
const BACKWARD_KEYS = new Set(['ArrowUp', 'PageUp']);

/**
 * Watches the user's own feed moves (arrow buttons, keys, wheel, touch). The user always wins:
 * listeners drop any pending advance, and a "next" that arrives while our advance is still in
 * flight is swallowed, because the feed is already heading there (otherwise both would land
 * and one video would be skipped).
 */
export class UserNavigationMonitor {
  private readonly listeners = new Set<UserNavigationListener>();

  constructor(
    private readonly win: Window,
    private readonly feed: Pick<FeedDom, 'activeItem' | 'isInsidePlayer' | 'isFeedScroller'>,
    private readonly state: NavigationState,
    private readonly log: Logger,
    /** Ignores our own synthetic clicks and keys. Overridable for tests. */
    private readonly isUserEvent: (event: Event) => boolean = (event) => event.isTrusted,
  ) {}

  onNavigate(listener: UserNavigationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Listens on window in the capture phase, ahead of TikTok's own handlers, so a swallowed
   * event never reaches them. Returns a stop function.
   */
  start(): () => void {
    const abort = new AbortController();
    const capture = { capture: true, signal: abort.signal };
    this.win.addEventListener(
      'click',
      (event) => {
        this.handle(event, clickDirection(event.target));
      },
      capture,
    );
    this.win.addEventListener(
      'keydown',
      (event) => {
        this.handle(event, keyDirection(event));
      },
      capture,
    );
    this.win.addEventListener(
      'wheel',
      (event) => {
        this.handle(event, this.wheelDirection(event));
      },
      { ...capture, passive: false },
    );
    this.win.addEventListener(
      'touchstart',
      (event) => {
        if (this.feed.isInsidePlayer(event.target)) this.handle(event, 'unknown');
      },
      { ...capture, passive: true },
    );
    this.win.addEventListener(
      'scroll',
      (event) => {
        if (this.feed.isFeedScroller(event.target)) this.state.recordScroll();
      },
      { ...capture, passive: true },
    );
    return () => {
      abort.abort();
    };
  }

  private handle(event: Event, direction: NavigationDirection | null): void {
    if (direction === null || !this.isUserEvent(event)) return;
    if (direction === 'forward' && this.state.isAdvancing()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.log('swallowed a manual "next": the feed is already advancing');
      return;
    }
    this.state.recordUserNavigation(this.feed.activeItem()?.id ?? null);
    for (const listener of this.listeners) listener(direction);
  }

  private wheelDirection(event: WheelEvent): NavigationDirection | null {
    if (event.deltaY === 0 || !this.feed.isInsidePlayer(event.target)) return null;
    return event.deltaY > 0 ? 'forward' : 'backward';
  }
}

function clickDirection(target: EventTarget | null): NavigationDirection | null {
  if (!(target instanceof Element)) return null;
  if (target.closest(SELECTORS.nextButton)) return 'forward';
  if (target.closest(SELECTORS.prevButton)) return 'backward';
  return null;
}

function keyDirection(event: KeyboardEvent): NavigationDirection | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.target instanceof Element && isEditable(event.target)) return null;
  if (FORWARD_KEYS.has(event.key)) return 'forward';
  if (BACKWARD_KEYS.has(event.key)) return 'backward';
  return null;
}
