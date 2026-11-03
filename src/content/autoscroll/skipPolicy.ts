import type { Settings } from '../../shared/settings';
import type { ItemTraits } from '../tiktok/traits';

export type SkipReason = 'live' | 'ad' | 'paid-partnership';

type SkipSettings = Pick<Settings, 'skipLive' | 'skipAds' | 'skipPaidPartnerships'>;

export function skipReasonFor(traits: ItemTraits, settings: SkipSettings): SkipReason | null {
  if (settings.skipLive && traits.live) return 'live';
  if (settings.skipAds && traits.ad) return 'ad';
  if (settings.skipPaidPartnerships && traits.paidPartnership) return 'paid-partnership';
  return null;
}
