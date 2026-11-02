import type { Logger } from '../log';
import type { FeedDom } from '../tiktok/feedDom';
import type { AdvanceStrategy } from './advanceStrategies';
import type { NavigationState } from './navigationState';

/**
 * - advanced: the feed is moving to the next item.
 * - busy: the feed is already moving; try again later.
 * - stale: the feed is no longer on that item, so there is nothing to do.
 */
export type AdvanceOutcome = 'advanced' | 'busy' | 'stale';

export class FeedNavigator {
  constructor(
    private readonly feed: FeedDom,
    private readonly state: NavigationState,
    private readonly strategies: readonly AdvanceStrategy[],
    private readonly log: Logger,
  ) {}

  /**
   * Moves to the item after `itemId`. Idempotent: if the feed already left that item
   * (TikTok or the user moved it), nothing happens, so one request can never skip two items.
   */
  advanceFrom(itemId: string, reason: string): AdvanceOutcome {
    const active = this.feed.activeItem();
    if (active?.id !== itemId) return 'stale';
    if (this.state.isAdvancing()) return 'busy';

    for (const strategy of this.strategies) {
      if (strategy.tryAdvance(active)) {
        this.state.beginAdvance(itemId);
        this.log(`advance via ${strategy.name}`, reason);
        return 'advanced';
      }
    }
    return 'busy';
  }
}
