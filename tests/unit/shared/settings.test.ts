import { describe, expect, it } from 'vitest';
import {
  clampPhotoSeconds,
  DEFAULT_SETTINGS,
  parseSettings,
  parseSettingsPatch,
  PHOTO_SECONDS_MAX,
} from '../../../src/shared/settings';

describe('settings', () => {
  it('fills missing keys with the defaults', () => {
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ enabled: true }).enabled).toBe(true);
  });

  it('drops unknown keys and values of the wrong type', () => {
    expect(parseSettingsPatch({ enabled: 'yes', photoSeconds: 5, legacyKey: 1 })).toEqual({
      photoSeconds: 5,
    });
  });

  it('defaults the new paid partnership option to off', () => {
    expect(DEFAULT_SETTINGS.skipPaidPartnerships).toBe(false);
  });

  it.each([
    [7, 7],
    [7.9, 7],
    [-3, 0],
    [999, PHOTO_SECONDS_MAX],
    [Number.NaN, 0],
  ])('clamps %s photo seconds to %s', (input, expected) => {
    expect(clampPhotoSeconds(input)).toBe(expected);
  });
});
