import type { Clock } from '../clock';
import { isEditable } from '../editable';
import type { FeedDom } from '../tiktok/feedDom';

export interface InteractionSource {
  isInteracting(): boolean;
}

/** The user is "interacting" while hovering the player, reading comments or typing. */
export class InteractionTracker implements InteractionSource {
  private lastMoveAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly doc: Document,
    private readonly feed: FeedDom,
    private readonly clock: Clock,
    private readonly windowMs: number,
  ) {}

  /** Returns a stop function. */
  start(): () => void {
    const onMove = (event: MouseEvent): void => {
      if (this.feed.isInsidePlayer(event.target)) this.lastMoveAt = this.clock.now();
    };
    this.doc.addEventListener('mousemove', onMove, { capture: true, passive: true });
    return () => {
      this.doc.removeEventListener('mousemove', onMove, { capture: true });
    };
  }

  isInteracting(): boolean {
    return (
      this.clock.now() - this.lastMoveAt < this.windowMs ||
      this.feed.commentsOpen() ||
      isEditable(this.doc.activeElement)
    );
  }
}
