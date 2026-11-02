import { describe, expect, it, vi } from 'vitest';
import { SettingsCache } from '../../../src/content/settingsCache';
import { MemorySettingsStore } from '../../../src/shared/memorySettingsStore';
import { DEFAULT_SETTINGS } from '../../../src/shared/settings';
import type { SettingsStore } from '../../../src/shared/settingsStore';

describe('SettingsCache', () => {
  it('starts with the defaults and loads the stored settings', async () => {
    const cache = new SettingsCache(new MemorySettingsStore({ enabled: true }));
    expect(cache.current).toEqual(DEFAULT_SETTINGS);
    await cache.load();
    expect(cache.current.enabled).toBe(true);
  });

  it('follows changes made elsewhere', () => {
    const store = new MemorySettingsStore();
    const cache = new SettingsCache(store);
    const onChange = vi.fn();
    cache.watch(onChange);
    void store.update({ skipAds: false });
    expect(cache.current.skipAds).toBe(false);
    expect(onChange).toHaveBeenCalledWith({ skipAds: false });
  });

  it('updates synchronously and persists in the background', async () => {
    const store = new MemorySettingsStore();
    const cache = new SettingsCache(store);
    cache.update({ watchedCount: 3 });
    expect(cache.current.watchedCount).toBe(3);
    expect((await store.load()).watchedCount).toBe(3);
  });

  it('logs failed saves instead of throwing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failing: SettingsStore = {
      load: () => Promise.resolve(DEFAULT_SETTINGS),
      update: () => Promise.reject(new Error('quota')),
      subscribe: () => () => undefined,
    };
    new SettingsCache(failing).update({ enabled: true });
    await vi.waitFor(() => {
      expect(error).toHaveBeenCalled();
    });
  });
});
