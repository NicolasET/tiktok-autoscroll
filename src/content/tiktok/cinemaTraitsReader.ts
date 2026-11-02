import type { FeedItem } from './feedDom';
import { hasAdMarker, hasLiveMarker, hasPaidPartnershipMarker, type MarkerScope } from './markers';
import { CINEMA_OVERLAY_ITEM_ID_ATTRIBUTE, CINEMA_SELECTORS, SELECTORS } from './selectors';
import type { ItemTraits, LayoutTraitsReader } from './traits';

/**
 * Layout served on For You since late 2026: media cards only hold the video, and a single
 * overlay outside them shows the caption, labels ("Publicidad") and author of the active item.
 */
export class CinemaTraitsReader implements LayoutTraitsReader {
  readonly layout = 'cinema';

  constructor(private readonly doc: Document) {}

  supports(): boolean {
    return this.overlay() !== null;
  }

  read(item: FeedItem): ItemTraits | null {
    const overlay = this.overlay();
    if (!overlay || !showsItem(overlay, item)) return null;

    const overlayScope: MarkerScope = {
      root: overlay,
      ignore: `${SELECTORS.description}, ${CINEMA_SELECTORS.creatorIdentity}`,
    };
    const mediaScope: MarkerScope = { root: item.element, ignore: SELECTORS.description };
    return {
      ad: hasAdMarker(overlayScope) || hasAdMarker(mediaScope),
      paidPartnership:
        hasPaidPartnershipMarker(overlayScope) || hasPaidPartnershipMarker(mediaScope),
      live: hasLiveMarker(overlayScope) || hasLiveMarker(mediaScope),
    };
  }

  private overlay(): Element | null {
    return this.doc.querySelector(CINEMA_SELECTORS.overlay);
  }
}

/**
 * The overlay switches a moment after the video does, so its labels only count once it
 * names the same video. Without an id on either side there is nothing to compare: trust it.
 */
function showsItem(overlay: Element, item: FeedItem): boolean {
  const overlayItemId =
    overlay
      .querySelector(`[${CINEMA_OVERLAY_ITEM_ID_ATTRIBUTE}]`)
      ?.getAttribute(CINEMA_OVERLAY_ITEM_ID_ATTRIBUTE) ?? null;
  return overlayItemId === null || item.videoId === null || overlayItemId === item.videoId;
}
