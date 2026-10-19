importScripts('defaults.js');

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(null);
  await chrome.storage.local.set({ ...TAS_DEFAULTS, ...current });
  updateBadge((await chrome.storage.local.get('enabled')).enabled);
});

chrome.runtime.onStartup.addListener(async () => {
  updateBadge((await chrome.storage.local.get('enabled')).enabled);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-autoscroll') return;
  const { enabled } = await chrome.storage.local.get('enabled');
  await chrome.storage.local.set({ enabled: !enabled });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enabled) updateBadge(changes.enabled.newValue);
});

function updateBadge(enabled) {
  chrome.action.setBadgeText({ text: enabled ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
}
