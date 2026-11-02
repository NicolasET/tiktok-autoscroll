/**
 * - off: the user turned autoscroll off.
 * - on: advancing when videos end and skipping LIVEs/ads.
 * - waiting: an advance is held back while the user interacts with the player.
 */
export type AutoscrollMode = 'off' | 'on' | 'waiting';

export interface AutoscrollStatus {
  readonly mode: AutoscrollMode;
  readonly onFeed: boolean;
  readonly watchedCount: number;
}
