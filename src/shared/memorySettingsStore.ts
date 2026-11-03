import { DEFAULT_SETTINGS, type Settings, type SettingsPatch } from './settings';
import type { SettingsListener, SettingsStore } from './settingsStore';

/** In-memory store, used when chrome.* APIs are missing (content script pasted in DevTools) and in tests. */
export class MemorySettingsStore implements SettingsStore {
  private settings: Settings;
  private readonly listeners = new Set<SettingsListener>();

  constructor(initial: SettingsPatch = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...initial };
  }

  load(): Promise<Settings> {
    return Promise.resolve(this.settings);
  }

  update(patch: SettingsPatch): Promise<void> {
    this.settings = { ...this.settings, ...patch };
    for (const listener of this.listeners) listener(patch);
    return Promise.resolve();
  }

  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
