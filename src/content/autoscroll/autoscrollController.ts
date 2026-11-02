import type { Settings } from '../../shared/settings';
import type { Clock } from '../clock';
import type { InteractionSource } from '../interaction/interactionTracker';
import type { Logger } from '../log';
import type { FeedNavigator } from '../navigation/feedNavigator';
import type { NavigationState } from '../navigation/navigationState';
import type { FinishReason, PlaybackListener } from '../playback/playbackEvents';
import type { FeedDom, FeedItem } from '../tiktok/feedDom';
import type { NativeAutoscrollProbe } from '../tiktok/nativeAutoscrollProbe';
import type { TraitsReader } from '../tiktok/traits';
import { skipReasonFor, type SkipReason } from './skipPolicy';
import type { AutoscrollMode, AutoscrollStatus } from './status';
import type { WatchCounter } from './watchCounter';

/** Lets TikTok (or the user) move on by themselves before we do. */
const ENDED_GRACE_MS = 300;
/** LIVEs and ads are skipped once they've been on screen this long. */
const SKIP_DELAY_MS = 700;
/** If the feed is still on the same item this long after an advance, try again. */
const RETRY_AFTER_MS = 2500;

type AdvanceReason = FinishReason | SkipReason | 'photo';

interface AdvanceRequest {
  readonly itemId: string;
  readonly reason: AdvanceReason;
  readonly notBefore: number;
  /** Ended videos and photo timers wait while the user interacts; skips don't. */
  readonly waitsForUser: boolean;
}

interface ActiveEntry {
  readonly item: FeedItem;
  readonly since: number;
  lastAttemptAt: number;
}

export interface AutoscrollControllerDeps {
  readonly settings: () => Settings;
  readonly feed: Pick<FeedDom, 'isFeedPage' | 'activeItem' | 'hasVideo'>;
  readonly traits: TraitsReader;
  readonly navigator: Pick<FeedNavigator, 'advanceFrom'>;
  readonly navigation: Pick<NavigationState, 'observeActive'>;
  readonly interaction: InteractionSource;
  readonly native: NativeAutoscrollProbe;
  readonly counter: Pick<WatchCounter, 'observe' | 'exclude'>;
  readonly clock: Clock;
  readonly log: Logger;
}

export type StatusListener = (status: AutoscrollStatus) => void;

/** Decides when the feed should move on: video ended, photo timer, LIVE/ad on screen. */
export class AutoscrollController implements PlaybackListener {
  private active: ActiveEntry | null = null;
  private request: AdvanceRequest | null = null;
  private readonly statusListeners = new Set<StatusListener>();

  constructor(private readonly deps: AutoscrollControllerDeps) {}

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  tick(): void {
    const { feed } = this.deps;
    const item = feed.isFeedPage() ? feed.activeItem() : null;
    if (item) {
      this.track(item);
      if (this.isRunning()) {
        this.considerSkip();
        this.considerPhoto();
        this.processRequest();
      }
    }
    this.publish();
  }

  onFinished(item: FeedItem, reason: FinishReason): void {
    if (!this.isRunning() || this.request?.waitsForUser === false) return;
    this.request = {
      itemId: item.id,
      reason,
      notBefore: this.deps.clock.now() + ENDED_GRACE_MS,
      waitsForUser: true,
    };
    setTimeout(() => {
      this.processRequest();
      this.publish();
    }, ENDED_GRACE_MS);
  }

  onPlay(): void {
    this.deps.navigation.observeActive(this.deps.feed.activeItem()?.id ?? null);
  }

  /** The user moved the feed themselves: their move replaces whatever we were about to do. */
  onUserNavigation(): void {
    if (this.request) this.deps.log('user navigated, dropping', this.request.reason);
    this.cancel();
  }

  /** Drops the pending advance, if any. */
  cancel(): void {
    this.request = null;
    this.publish();
  }

  /** Re-publishes the status, e.g. after a settings change. */
  refresh(): void {
    this.publish();
  }

  status(): AutoscrollStatus {
    return {
      mode: this.mode(),
      onFeed: this.deps.feed.isFeedPage(),
      watchedCount: this.deps.settings().watchedCount,
    };
  }

  /** TikTok's own autoscroll wins: while it is on, the extension doesn't advance or skip anything. */
  private isRunning(): boolean {
    return this.deps.settings().enabled && !this.deps.native.isActive();
  }

  private mode(): AutoscrollMode {
    if (!this.deps.settings().enabled) return 'off';
    if (this.deps.native.isActive()) return 'native';
    return this.request?.waitsForUser === true && this.isUserBusy() ? 'waiting' : 'on';
  }

  private isUserBusy(): boolean {
    return this.deps.settings().pauseOnInteract && this.deps.interaction.isInteracting();
  }

  private track(item: FeedItem): void {
    const now = this.deps.clock.now();
    this.deps.navigation.observeActive(item.id);
    if (this.active?.item.id !== item.id) {
      this.active = { item, since: now, lastAttemptAt: Number.NEGATIVE_INFINITY };
      this.request = null;
    }
    this.deps.counter.observe(item.id, now - this.active.since);
  }

  private considerSkip(): void {
    const active = this.active;
    if (!active || this.request?.waitsForUser === false) return;
    const now = this.deps.clock.now();
    if (now - active.since < SKIP_DELAY_MS || now - active.lastAttemptAt < RETRY_AFTER_MS) return;

    const traits = this.deps.traits.read(active.item);
    const reason = traits ? skipReasonFor(traits, this.deps.settings()) : null;
    if (!reason) return;

    this.deps.counter.exclude(active.item.id);
    this.request = { itemId: active.item.id, reason, notBefore: now, waitsForUser: false };
    this.deps.log(`skipping ${reason}`, active.item.id);
  }

  /** Photo/carousel posts have no "ended" event, so they advance on a timer. */
  private considerPhoto(): void {
    const active = this.active;
    const { photoSeconds } = this.deps.settings();
    if (!active || this.request || photoSeconds <= 0 || this.deps.feed.hasVideo(active.item)) {
      return;
    }
    const now = this.deps.clock.now();
    if (now - active.since < photoSeconds * 1000 || now - active.lastAttemptAt < RETRY_AFTER_MS) {
      return;
    }
    this.request = { itemId: active.item.id, reason: 'photo', notBefore: now, waitsForUser: true };
  }

  private processRequest(): void {
    const { request, active } = this;
    if (!request) return;
    if (!this.isRunning() || active?.item.id !== request.itemId) {
      this.request = null;
      return;
    }
    const now = this.deps.clock.now();
    if (now < request.notBefore || (request.waitsForUser && this.isUserBusy())) return;

    const outcome = this.deps.navigator.advanceFrom(request.itemId, request.reason);
    if (outcome === 'busy') return;
    if (outcome === 'advanced') active.lastAttemptAt = now;
    this.request = null;
  }

  private publish(): void {
    const status = this.status();
    for (const listener of this.statusListeners) listener(status);
  }
}
