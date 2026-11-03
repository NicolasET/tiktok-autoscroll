import { ChromeSettingsStore } from '../shared/chromeSettingsStore';
import { TOGGLE_AUTOSCROLL_COMMAND } from '../shared/commands';
import { clampPhotoSeconds, type Settings, type SettingsPatch } from '../shared/settings';
import type { SettingsStore } from '../shared/settingsStore';

type BooleanSettingKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

/** Each toggle's <input> id matches its settings key. */
const TOGGLES: readonly BooleanSettingKey[] = [
  'enabled',
  'skipLive',
  'skipAds',
  'skipPaidPartnerships',
  'pauseOnInteract',
  'showFloating',
];

function byId<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) throw new Error(`Popup markup is missing #${id}`);
  return element;
}

function save(store: SettingsStore, patch: SettingsPatch): void {
  store.update(patch).catch((error: unknown) => {
    console.error('[Autoscroll for TikTok] could not save settings', error);
  });
}

function bindToggles(store: SettingsStore, settings: Settings): void {
  for (const key of TOGGLES) {
    const input = byId(key, HTMLInputElement);
    input.checked = settings[key];
    input.addEventListener('change', () => {
      save(store, { [key]: input.checked });
    });
  }
}

function bindPhotoSeconds(store: SettingsStore, settings: Settings): void {
  const input = byId('photoSeconds', HTMLInputElement);
  input.value = String(settings.photoSeconds);
  input.addEventListener('change', () => {
    const seconds = clampPhotoSeconds(Number.parseInt(input.value, 10));
    input.value = String(seconds);
    save(store, { photoSeconds: seconds });
  });
}

function bindCounter(store: SettingsStore, settings: Settings): void {
  byId('watchedCount', HTMLElement).textContent = String(settings.watchedCount);
  byId('reset', HTMLButtonElement).addEventListener('click', () => {
    save(store, { watchedCount: 0 });
  });
}

/** Mirrors changes made elsewhere (floating button, shortcut, counter). */
function followChanges(store: SettingsStore): void {
  store.subscribe((changes) => {
    if (changes.watchedCount !== undefined) {
      byId('watchedCount', HTMLElement).textContent = String(changes.watchedCount);
    }
    for (const key of TOGGLES) {
      const value = changes[key];
      if (value !== undefined) byId(key, HTMLInputElement).checked = value;
    }
  });
}

async function showShortcut(): Promise<void> {
  const commands = await chrome.commands.getAll();
  const shortcut = commands.find((c) => c.name === TOGGLE_AUTOSCROLL_COMMAND)?.shortcut ?? '';
  byId('shortcut', HTMLElement).textContent = shortcut === '' ? 'sin asignar' : shortcut;
  byId('editShortcut', HTMLAnchorElement).addEventListener('click', (event) => {
    event.preventDefault();
    void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
}

async function init(): Promise<void> {
  const store = new ChromeSettingsStore(chrome.storage);
  const settings = await store.load();
  bindToggles(store, settings);
  bindPhotoSeconds(store, settings);
  bindCounter(store, settings);
  followChanges(store);
  await showShortcut();
}

init().catch((error: unknown) => {
  console.error('[Autoscroll for TikTok]', error);
});
