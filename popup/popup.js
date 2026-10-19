const TOGGLES = ['enabled', 'skipLive', 'skipAds', 'pauseOnInteract', 'showFloating'];
const $ = (id) => document.getElementById(id);

async function init() {
  const cfg = { ...TAS_DEFAULTS, ...(await chrome.storage.local.get(null)) };

  for (const k of TOGGLES) {
    $(k).checked = !!cfg[k];
    $(k).addEventListener('change', (e) => chrome.storage.local.set({ [k]: e.target.checked }));
  }

  $('photoSeconds').value = cfg.photoSeconds;
  $('photoSeconds').addEventListener('change', (e) => {
    const n = Math.max(0, Math.min(120, parseInt(e.target.value, 10) || 0));
    e.target.value = n;
    chrome.storage.local.set({ photoSeconds: n });
  });

  $('watchedCount').textContent = cfg.watchedCount || 0;
  $('reset').addEventListener('click', () => chrome.storage.local.set({ watchedCount: 0 }));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.watchedCount) $('watchedCount').textContent = changes.watchedCount.newValue || 0;
    if (changes.enabled) $('enabled').checked = !!changes.enabled.newValue;
  });

  const cmds = await chrome.commands.getAll();
  const toggle = cmds.find((c) => c.name === 'toggle-autoscroll');
  $('shortcut').textContent = (toggle && toggle.shortcut) || 'sin asignar';

  $('editShortcut').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
}

init();
