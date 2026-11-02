import type { Settings } from '../../shared/settings';
import type { ItemTraits } from '../tiktok/traits';

export type SkipReason = 'live' | 'ad';

type SkipSettings = Pick<Settings, 'skipLive' | 'skipAds'>;

export function skipReasonFor(traits: ItemTraits, settings: SkipSettings): SkipReason | null {
  if (settings.skipLive && traits.live) return 'live';
  if (settings.skipAds && traits.ad) return 'ad';
  return null;
}
