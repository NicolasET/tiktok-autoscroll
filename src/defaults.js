// Shared defaults. Loaded by background (importScripts) and popup (<script>).
// content.js keeps its own copy because MV3 content scripts can't import modules.
const TAS_DEFAULTS = {
  enabled: false,
  skipLive: true,
  skipAds: true,
  pauseOnInteract: true,
  showFloating: true,
  photoSeconds: 12, // photo/carousel posts have no "ended" event; 0 = never advance
  watchedCount: 0
};
