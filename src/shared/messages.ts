/** What the toolbar badge shows for a TikTok tab. */
export const BADGE_STATES = ['off', 'on', 'native'] as const;
export type BadgeState = (typeof BADGE_STATES)[number];

const BADGE_STATE_MESSAGE = 'tas/badge-state';

/** Content script → background: the badge state of the sender's tab changed. */
export interface BadgeStateMessage {
  readonly type: typeof BADGE_STATE_MESSAGE;
  readonly state: BadgeState;
}

export function badgeStateMessage(state: BadgeState): BadgeStateMessage {
  return { type: BADGE_STATE_MESSAGE, state };
}

export function isBadgeStateMessage(value: unknown): value is BadgeStateMessage {
  if (typeof value !== 'object' || value === null) return false;
  const { type, state } = value as Record<string, unknown>;
  return type === BADGE_STATE_MESSAGE && (BADGE_STATES as readonly unknown[]).includes(state);
}
