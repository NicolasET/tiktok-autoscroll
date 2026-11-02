import type { FeedItem } from './feedDom';

export interface ItemTraits {
  readonly ad: boolean;
  readonly paidPartnership: boolean;
  readonly live: boolean;
}

export interface TraitsReader {
  /** Returns null while TikTok hasn't rendered the item's labels yet. */
  read(item: FeedItem): ItemTraits | null;
}

/** A TraitsReader that understands one TikTok feed layout. */
export interface LayoutTraitsReader extends TraitsReader {
  readonly layout: string;
  supports(): boolean;
}

/** Delegates to the first reader whose layout is on the page, so new layouts plug in without edits here. */
export class LayoutAwareTraitsReader implements TraitsReader {
  constructor(private readonly readers: readonly LayoutTraitsReader[]) {}

  read(item: FeedItem): ItemTraits | null {
    return this.current()?.read(item) ?? null;
  }

  layout(): string | null {
    return this.current()?.layout ?? null;
  }

  private current(): LayoutTraitsReader | undefined {
    return this.readers.find((reader) => reader.supports());
  }
}
