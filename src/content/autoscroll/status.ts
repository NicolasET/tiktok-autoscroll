/**
 * - off: the user turned autoscroll off.
 * - on: advancing when videos end and skipping LIVEs/ads.
 * - waiting: an advance is held back while the user interacts with the player.
 * - native: TikTok's own autoscroll is on, so the extension stands aside entirely.
 */
export type AutoscrollMode = 'off' | 'on' | 'waiting' | 'native';

export interface AutoscrollStatus {
  readonly mode: AutoscrollMode;
  readonly onFeed: boolean;
  readonly watchedCount: number;
}
