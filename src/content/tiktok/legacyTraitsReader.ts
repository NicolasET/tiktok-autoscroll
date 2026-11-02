import type { FeedItem } from './feedDom';
import { hasAdMarker, hasLiveMarker, type MarkerScope } from './markers';
import { SELECTORS } from './selectors';
import type { ItemTraits, LayoutTraitsReader } from './traits';

/**
 * Layout where each media card carries its own overlay (caption, labels, author). TikTok
 * still serves it on the Following feed. It doubles as the fallback for unknown layouts.
 */
export class LegacyTraitsReader implements LayoutTraitsReader {
  readonly layout = 'legacy';

  supports(): boolean {
    return true;
  }

  read(item: FeedItem): ItemTraits {
    const scope: MarkerScope = { root: item.element, ignore: SELECTORS.description };
    return { ad: hasAdMarker(scope), live: hasLiveMarker(scope) };
  }
}
