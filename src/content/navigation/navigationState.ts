import type { Clock } from '../clock';

export interface NavigationTiming {
  /** Stops waiting for TikTok to show another item after this long. */
  readonly moveTimeoutMs: number;
  /** Keeps our own advance "in flight" this long after the next item shows up. */
  readonly arrivalGuardMs: number;
  /** After the user moves the feed, leave it alone at least this long. */
  readonly userSettleMs: number;
  /** The feed counts as moving until this long after its last scroll event. */
  readonly scrollSettleMs: number;
}

export const DEFAULT_NAVIGATION_TIMING: NavigationTiming = {
  // TikTok can take ~2.5 s to move while it loads the next video, ignoring "next" meanwhile.
  moveTimeoutMs: 3000,
  arrivalGuardMs: 500,
  userSettleMs: 1000,
  scrollSettleMs: 150,
};

/** A feed move that started on `fromId` and lands once another item becomes active. */
interface Move {
  readonly fromId: string | null;
  readonly startedAt: number;
  arrivedAt: number | null;
}

/**
 * Timeline of feed moves, ours and the user's: the navigator and the user monitor record them,
 * every guard reads them. A move stays pending until TikTok actually shows another item.
 */
export class NavigationState {
  private ownMove: Move | null = null;
  private userMove: Move | null = null;
  private lastScrollAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly clock: Clock,
    private readonly timing: NavigationTiming,
  ) {}

  beginAdvance(fromId: string): void {
    this.ownMove = this.startMove(fromId);
  }

  /** `fromId` is the item the user moved away from, when known. */
  recordUserNavigation(fromId: string | null): void {
    this.userMove = this.startMove(fromId);
  }

  /** Call whenever the active item may have changed (ticks, play events). */
  observeActive(activeId: string | null): void {
    if (activeId === null) return;
    for (const move of [this.ownMove, this.userMove]) {
      if (move?.arrivedAt === null && move.fromId !== activeId) move.arrivedAt = this.clock.now();
    }
  }

  isAdvancing(): boolean {
    if (!this.ownMove) return false;
    if (this.isPending(this.ownMove, this.timing.arrivalGuardMs)) return true;
    this.ownMove = null;
    return false;
  }

  userNavigatedRecently(): boolean {
    const move = this.userMove;
    if (!move) return false;
    return this.clock.now() - move.startedAt < this.timing.userSettleMs || this.isPending(move, 0);
  }

  recordScroll(): void {
    this.lastScrollAt = this.clock.now();
  }

  isScrolling(): boolean {
    return this.clock.now() - this.lastScrollAt < this.timing.scrollSettleMs;
  }

  private startMove(fromId: string | null): Move {
    return { fromId, startedAt: this.clock.now(), arrivedAt: null };
  }

  private isPending(move: Move, guardMs: number): boolean {
    const now = this.clock.now();
    if (now - move.startedAt >= this.timing.moveTimeoutMs) return false;
    return move.arrivedAt === null || now - move.arrivedAt < guardMs;
  }
}
