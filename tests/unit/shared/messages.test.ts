import { describe, expect, it } from 'vitest';
import { badgeStateMessage, isBadgeStateMessage } from '../../../src/shared/messages';

describe('badge state messages', () => {
  it.each(['off', 'on', 'native'] as const)('accepts the %s state', (state) => {
    expect(isBadgeStateMessage(badgeStateMessage(state))).toBe(true);
  });

  it.each([
    ['null', null],
    ['strings', 'tas/badge-state'],
    ['other message types', { type: 'other', state: 'on' }],
    ['unknown states', { type: 'tas/badge-state', state: 'waiting' }],
  ])('rejects %s', (_, value) => {
    expect(isBadgeStateMessage(value)).toBe(false);
  });
});
