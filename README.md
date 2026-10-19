# Autoscroll for TikTok

Chrome extension (Manifest V3) that moves to the next video on TikTok web when the current one ends.

> Not affiliated with, endorsed by, or sponsored by TikTok or ByteDance.

## Features

- **Advance on end**: listens for the active `<video>`'s `ended` event (with a fallback for natively looping videos) and clicks TikTok's own "next" button, falling back to `scrollIntoView` and then `ArrowDown`.
- **Skip LIVEs and ads**: detects `data-e2e="ad-tag"` / "Publicidad" / "Patrocinado" labels and LIVE badges/links, and skips them right away.
- **Pause while interacting**: if you move the mouse over the video, open the comments panel or are typing, the advance waits (the floating button turns yellow, "En espera") and fires once you stop.
- **Photo posts**: carousels have no `ended` event, so they advance after N seconds (configurable, 0 = never).
- **Watched counter**: counts each video that stays on screen for 3+ seconds (skipped items don't count). Reset from the popup.
- **Three controls**: popup toggle, floating in-page button and the `Alt+Shift+S` shortcut (editable at `chrome://extensions/shortcuts`). The toolbar icon shows an `ON` badge while active.

## Install (developer mode)

1. Clone or download this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the repo folder.
4. Open https://www.tiktok.com, then turn it on from the popup, the floating button or `Alt+Shift+S`.

## Structure

```
manifest.json
src/
  background.js   # shortcut, badge, default config
  content.js      # feed logic + floating button
  content.css
  defaults.js     # shared defaults (background + popup)
popup/
  popup.html | popup.css | popup.js
icons/
```

## Selectors used (TikTok web, Oct 2026)

| Purpose | Selector |
|---|---|
| Feed item | `[data-e2e="feed-video"]` |
| Next button | `[data-e2e="feed-navigation-next"]` |
| Ad | `[data-e2e="ad-tag"]`, "Publicidad" text |
| Comments open | `[data-e2e="comment-level-1"]`, `[data-e2e="comment-input"]`, `DivCommentListContainer` |

If TikTok changes its DOM, update `SEL` in `src/content.js`.

## Debug

The extension runs in Chrome's isolated world, so its internals aren't reachable from the page console. To poke at the logic directly, paste `src/content.js` into the TikTok tab's DevTools console: without `chrome.*` APIs it runs with in-memory config and exposes `window.__tas` (`state()`, `set({ enabled: true })`, `advance()`). Set `window.__tasDebug = true` first to log each advance/skip.

## Privacy

No data leaves your browser. Settings and the counter live in `chrome.storage.local`; there are no network requests, analytics or remote code.

## License

MIT
