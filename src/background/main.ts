// Service worker: seeds default settings, handles the keyboard shortcut and keeps the badge in sync.
import { ChromeSettingsStore } from '../shared/chromeSettingsStore';
import { TOGGLE_AUTOSCROLL_COMMAND } from '../shared/commands';
import { BadgePresenter } from './badgePresenter';

const store = new ChromeSettingsStore(chrome.storage);
const badge = new BadgePresenter(chrome.action);

async function showStoredState(): Promise<void> {
  await badge.showGlobal((await store.load()).enabled);
}

/** Writes every setting back, so new keys get their defaults and invalid values are repaired. */
async function seedDefaults(): Promise<void> {
  await store.update(await store.load());
  await showStoredState();
}

async function toggleAutoscroll(): Promise<void> {
  const { enabled } = await store.load();
  await store.update({ enabled: !enabled });
}

function reportErrors(task: Promise<void>): void {
  task.catch((error: unknown) => {
    console.error('[Autoscroll for TikTok]', error);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  reportErrors(seedDefaults());
});

chrome.runtime.onStartup.addListener(() => {
  reportErrors(showStoredState());
});

chrome.commands.onCommand.addListener((command) => {
  if (command === TOGGLE_AUTOSCROLL_COMMAND) reportErrors(toggleAutoscroll());
});

store.subscribe((changes) => {
  if (changes.enabled !== undefined) reportErrors(badge.showGlobal(changes.enabled));
});
