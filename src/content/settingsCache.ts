import { DEFAULT_SETTINGS, type Settings, type SettingsPatch } from '../shared/settings';
import type { SettingsStore } from '../shared/settingsStore';

/** Synchronous view of the settings, kept in sync with the store. */
export class SettingsCache {
  private value: Settings = DEFAULT_SETTINGS;

  constructor(private readonly store: SettingsStore) {}

  get current(): Settings {
    return this.value;
  }

  async load(): Promise<void> {
    this.value = await this.store.load();
  }

  /** Returns an unsubscribe function. */
  watch(onChange: (changes: SettingsPatch) => void): () => void {
    return this.store.subscribe((changes) => {
      this.value = { ...this.value, ...changes };
      onChange(changes);
    });
  }

  update(patch: SettingsPatch): void {
    this.value = { ...this.value, ...patch };
    this.store.update(patch).catch((error: unknown) => {
      console.error('[Autoscroll for TikTok] could not save settings', error);
    });
  }
}
