import type { Settings, SettingsPatch } from './settings';

export type SettingsListener = (changes: SettingsPatch) => void;

/** Persistence port for the user settings. */
export interface SettingsStore {
  load(): Promise<Settings>;
  update(patch: SettingsPatch): Promise<void>;
  /** Notifies every change, including the ones made by other extension pages. Returns an unsubscribe function. */
  subscribe(listener: SettingsListener): () => void;
}
