import { PLAYER_WRAPPER_ID_PREFIX, SELECTORS } from './selectors';

export interface FeedItem {
  /** Stable id of the post: TikTok's video id when the player exposes it. */
  readonly id: string;
  /** TikTok's video id, or null for posts without a video player (photo carousels). */
  readonly videoId: string | null;
  /** The media card ([data-e2e="feed-video"]). */
  readonly element: HTMLElement;
}

const MIN_CARD_HEIGHT_PX = 50;
const HAVE_CURRENT_DATA = 2;

/** Read-only queries over the For You / Following feed that hold for every TikTok layout. */
export class FeedDom {
  constructor(private readonly doc: Document) {}

  isFeedPage(): boolean {
    return this.doc.querySelector(SELECTORS.mediaCard) !== null;
  }

  activeItem(): FeedItem | null {
    const card = this.playingCard() ?? this.centeredCard();
    return card ? toFeedItem(card) : null;
  }

  itemOf(node: Node): FeedItem | null {
    const card = node instanceof Element ? node.closest<HTMLElement>(SELECTORS.mediaCard) : null;
    return card ? toFeedItem(card) : null;
  }

  itemAfter(item: FeedItem): FeedItem | null {
    const cards = this.cards();
    const index = cards.indexOf(item.element);
    const next = index === -1 ? undefined : cards[index + 1];
    return next ? toFeedItem(next) : null;
  }

  hasVideo(item: FeedItem): boolean {
    return item.element.querySelector('video') !== null;
  }

  nextButton(): HTMLButtonElement | null {
    return this.doc.querySelector<HTMLButtonElement>(SELECTORS.nextButton);
  }

  isInsidePlayer(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(SELECTORS.playerArea) !== null;
  }

  /** The element (or document) whose scrolling moves the feed between items. */
  isFeedScroller(target: EventTarget | null): boolean {
    if (target instanceof Document) return true;
    return target instanceof Element && target.querySelector(SELECTORS.mediaCard) !== null;
  }

  commentsOpen(): boolean {
    const viewportHeight = this.viewportHeight();
    return [...this.doc.querySelectorAll(SELECTORS.comments)].some((el) =>
      isOnScreen(el, viewportHeight),
    );
  }

  private cards(): HTMLElement[] {
    return [...this.doc.querySelectorAll<HTMLElement>(SELECTORS.mediaCard)];
  }

  private playingCard(): HTMLElement | null {
    const videos = this.doc.querySelectorAll<HTMLVideoElement>(`${SELECTORS.mediaCard} video`);
    for (const video of videos) {
      if (!video.paused && !video.ended && video.readyState >= HAVE_CURRENT_DATA) {
        return video.closest<HTMLElement>(SELECTORS.mediaCard);
      }
    }
    return null;
  }

  /** Fallback for photo posts and paused videos: the card closest to the viewport center. */
  private centeredCard(): HTMLElement | null {
    const middle = this.viewportHeight() / 2;
    let best: HTMLElement | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const card of this.cards()) {
      const rect = card.getBoundingClientRect();
      if (rect.height < MIN_CARD_HEIGHT_PX) continue;
      const distance = Math.abs((rect.top + rect.bottom) / 2 - middle);
      if (distance < bestDistance) {
        best = card;
        bestDistance = distance;
      }
    }
    return bestDistance < middle ? best : null;
  }

  private viewportHeight(): number {
    return this.doc.defaultView?.innerHeight ?? 0;
  }
}

function toFeedItem(card: HTMLElement): FeedItem {
  const wrapper = card.querySelector(SELECTORS.playerWrapper);
  const videoId = wrapper ? wrapper.id.replace(PLAYER_WRAPPER_ID_PREFIX, '') : null;
  return { id: videoId ?? `card:${card.id}`, videoId, element: card };
}

function isOnScreen(el: Element, viewportHeight: number): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < viewportHeight;
}
