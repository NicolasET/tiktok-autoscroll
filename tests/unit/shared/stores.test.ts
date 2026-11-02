import { describe, expect, it, vi } from 'vitest';
import { ChromeSettingsStore } from '../../../src/shared/chromeSettingsStore';
import { MemorySettingsStore } from '../../../src/shared/memorySettingsStore';
import { DEFAULT_SETTINGS } from '../../../src/shared/settings';

type ChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: chrome.storage.AreaName,
) => void;

/** The slice of chrome.storage the store uses, backed by a plain object. */
function fakeChromeStorage(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...initial };
  const listeners = new Set<ChangeListener>();
  const api = {
    local: {
      get: vi.fn(() => Promise.resolve({ ...data })),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(data, items);
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: (listener: ChangeListener) => listeners.add(listener),
      removeListener: (listener: ChangeListener) => listeners.delete(listener),
    },
  };
  const emit = (
    changes: Record<string, unknown>,
    area: chrome.storage.AreaName = 'local',
  ): void => {
    const storageChanges = Object.fromEntries(
      Object.entries(changes).map(([key, newValue]) => [key, { newValue }]),
    );
    for (const listener of listeners) listener(storageChanges, area);
  };
  return { api: api as unknown as ConstructorParameters<typeof ChromeSettingsStore>[0], emit };
}

describe('ChromeSettingsStore', () => {
  it('loads the stored settings over the defaults', async () => {
    const { api } = fakeChromeStorage({ enabled: true, skipAds: 'nope' });
    const settings = await new ChromeSettingsStore(api).load();
    expect(settings).toEqual({ ...DEFAULT_SETTINGS, enabled: true });
  });

  it('saves patches', async () => {
    const { api } = fakeChromeStorage();
    const store = new ChromeSettingsStore(api);
    await store.update({ photoSeconds: 20 });
    expect((await store.load()).photoSeconds).toBe(20);
  });

  it('notifies valid local changes only', () => {
    const { api, emit } = fakeChromeStorage();
    const listener = vi.fn();
    const unsubscribe = new ChromeSettingsStore(api).subscribe(listener);

    emit({ enabled: true, unknown: 1 });
    emit({ enabled: false }, 'sync');
    emit({ unknown: 1 });
    expect(listener.mock.calls).toEqual([[{ enabled: true }]]);

    unsubscribe();
    emit({ enabled: false });
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('MemorySettingsStore', () => {
  it('keeps settings in memory and notifies subscribers', async () => {
    const store = new MemorySettingsStore({ enabled: true });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await store.update({ skipLive: false });
    expect(await store.load()).toEqual({ ...DEFAULT_SETTINGS, enabled: true, skipLive: false });
    expect(listener).toHaveBeenCalledWith({ skipLive: false });

    unsubscribe();
    await store.update({ skipLive: true });
    expect(listener).toHaveBeenCalledOnce();
  });
});
