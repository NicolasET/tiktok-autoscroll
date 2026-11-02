import { parseSettings, parseSettingsPatch, type Settings, type SettingsPatch } from './settings';
import type { SettingsListener, SettingsStore } from './settingsStore';

type StorageApi = Pick<typeof chrome.storage, 'local' | 'onChanged'>;

export class ChromeSettingsStore implements SettingsStore {
  constructor(private readonly storage: StorageApi) {}

  async load(): Promise<Settings> {
    return parseSettings(await this.storage.local.get(null));
  }

  async update(patch: SettingsPatch): Promise<void> {
    await this.storage.local.set(patch);
  }

  subscribe(listener: SettingsListener): () => void {
    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: chrome.storage.AreaName,
    ): void => {
      if (areaName !== 'local') return;
      const values = Object.fromEntries(
        Object.entries(changes).map(([key, change]) => [key, change.newValue]),
      );
      const patch = parseSettingsPatch(values);
      if (Object.keys(patch).length > 0) listener(patch);
    };
    this.storage.onChanged.addListener(onChanged);
    return () => {
      this.storage.onChanged.removeListener(onChanged);
    };
  }
}
