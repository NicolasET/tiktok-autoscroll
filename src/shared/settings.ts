export interface Settings {
  readonly enabled: boolean;
  readonly skipLive: boolean;
  readonly skipAds: boolean;
  /** Creator videos labelled "Colaboración de pago" (brand deals, not TikTok ads). */
  readonly skipPaidPartnerships: boolean;
  readonly pauseOnInteract: boolean;
  readonly showFloating: boolean;
  /** Photo/carousel posts have no "ended" event, so they advance after this many seconds. 0 = never. */
  readonly photoSeconds: number;
  readonly watchedCount: number;
}

export type SettingsPatch = Partial<Settings>;

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  enabled: false,
  skipLive: true,
  skipAds: true,
  skipPaidPartnerships: false,
  pauseOnInteract: true,
  showFloating: true,
  photoSeconds: 12,
  watchedCount: 0,
});

export const PHOTO_SECONDS_MAX = 120;

export function clampPhotoSeconds(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(PHOTO_SECONDS_MAX, Math.max(0, Math.trunc(value)));
}

function isSettingsKey(key: string): key is keyof Settings {
  return Object.hasOwn(DEFAULT_SETTINGS, key);
}

/**
 * Keeps only known keys whose value has the expected type, so whatever ends up in
 * storage (older versions, manual edits) can never break the extension.
 */
export function parseSettingsPatch(raw: Readonly<Record<string, unknown>>): SettingsPatch {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isSettingsKey(key) && typeof value === typeof DEFAULT_SETTINGS[key]) patch[key] = value;
  }
  return patch;
}

export function parseSettings(raw: Readonly<Record<string, unknown>>): Settings {
  return { ...DEFAULT_SETTINGS, ...parseSettingsPatch(raw) };
}
