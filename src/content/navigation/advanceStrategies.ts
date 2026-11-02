import type { FeedDom, FeedItem } from '../tiktok/feedDom';

/** One way of moving the feed forward. Returns false when it can't be used right now. */
export interface AdvanceStrategy {
  readonly name: string;
  tryAdvance(from: FeedItem): boolean;
}

/** TikTok's own "next" arrow: keeps the player state, counters and history consistent. */
export class NextButtonStrategy implements AdvanceStrategy {
  readonly name = 'next button';

  constructor(private readonly feed: FeedDom) {}

  tryAdvance(): boolean {
    const button = this.feed.nextButton();
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return false;
    button.click();
    return true;
  }
}

export class ScrollIntoViewStrategy implements AdvanceStrategy {
  readonly name = 'scrollIntoView';

  constructor(private readonly feed: FeedDom) {}

  tryAdvance(from: FeedItem): boolean {
    const next = this.feed.itemAfter(from);
    if (!next) return false;
    next.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }
}

export class ArrowDownKeyStrategy implements AdvanceStrategy {
  readonly name = 'ArrowDown';

  constructor(private readonly doc: Document) {}

  tryAdvance(): boolean {
    this.doc.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        code: 'ArrowDown',
        keyCode: 40, // TikTok's key handler may still read the legacy keyCode

        bubbles: true,
      }),
    );
    return true;
  }
}
