import type { Clock } from '../clock';

export interface NavigationTiming {
  /** Gives up waiting for TikTok to show the next item after this long. */
  readonly advanceTimeoutMs: number;
  /** Keeps the advance "in flight" this long after the next item shows up. */
  readonly arrivalGuardMs: number;
}

interface Advance {
  readonly fromId: string;
  readonly startedAt: number;
  arrivedAt: number | null;
}

/** Timeline of feed moves: the navigator records them and every guard reads them. */
export class NavigationState {
  private advance: Advance | null = null;

  constructor(
    private readonly clock: Clock,
    private readonly timing: NavigationTiming,
  ) {}

  beginAdvance(fromId: string): void {
    this.advance = { fromId, startedAt: this.clock.now(), arrivedAt: null };
  }

  /** Call whenever the active item may have changed (ticks, play events). */
  observeActive(activeId: string | null): void {
    const advance = this.advance;
    if (advance?.arrivedAt === null && activeId !== null && activeId !== advance.fromId) {
      advance.arrivedAt = this.clock.now();
    }
  }

  isAdvancing(): boolean {
    const advance = this.advance;
    if (!advance) return false;
    const now = this.clock.now();
    const timedOut = now - advance.startedAt >= this.timing.advanceTimeoutMs;
    const settled =
      advance.arrivedAt !== null && now - advance.arrivedAt >= this.timing.arrivalGuardMs;
    if (timedOut || settled) {
      this.advance = null;
      return false;
    }
    return true;
  }
}
