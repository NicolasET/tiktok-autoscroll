# Autoscroll for TikTok

Chrome extension (Manifest V3) that moves to the next video on TikTok web when the current one ends.

> Not affiliated with, endorsed by, or sponsored by TikTok or ByteDance.

## Features

- **Advance on end**: listens for the active `<video>`'s `ended` event (with a fallback for natively looping videos) and clicks TikTok's own "next" button, falling back to `scrollIntoView` and then `ArrowDown`.
- **Skip LIVEs and ads**: detects TikTok's ad labels (`data-e2e="ad-tag"`, "Publicidad", the ad call-to-action) and LIVE badges/links, in both of TikTok's feed layouts.
- **Paid partnerships (optional)**: creator videos labelled "Colaboración de pago" are not ads, so they play normally unless you turn on "Saltar colaboraciones de pago".
- **TikTok's own autoscroll wins**: when TikTok's "Pasar automáticamente" is on, the extension stands aside completely (no advancing, no skipping). The floating button shows "TikTok auto", the tab's badge shows `TT`, and the extension resumes by itself once you turn TikTok's switch off.
- **Your clicks win**: pressing "next"/"previous" (or the arrow keys, wheel, a swipe) cancels whatever the extension was about to do, and a "next" that lands while the extension is already advancing is absorbed, so a video is never skipped by accident.
- **Pause while interacting**: if you move the mouse over the player, open the comments panel or are typing, the advance waits (the floating button turns yellow, "En espera") and fires once you stop.
- **Photo posts**: carousels have no `ended` event, so they advance after N seconds (configurable, 0 = never).
- **Watched counter**: counts each video that stays on screen for 3+ seconds (skipped items don't count). Reset from the popup.
- **Three controls**: popup toggle, floating in-page button and the `Alt+Shift+S` shortcut (editable at `chrome://extensions/shortcuts`). The toolbar icon shows an `ON` badge while active.

## Install (developer mode)

Requires Node.js 22.18+ and pnpm 10.

```bash
pnpm install
pnpm build
```

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the **`dist/`** folder (not the repo root).
3. Open https://www.tiktok.com, then turn it on from the popup, the floating button or `Alt+Shift+S`.

After pulling changes, run `pnpm build` again and press the reload icon on the extension's card.

## Development

| Command              | What it does                                                         |
| -------------------- | -------------------------------------------------------------------- |
| `pnpm build`         | Bundles `src/` into `dist/` with esbuild                             |
| `pnpm watch`         | Rebuilds on every change                                             |
| `pnpm zip`           | Builds and packs `tiktok-autoscroll-<version>.zip` for the Web Store |
| `pnpm typecheck`     | TypeScript, for the extension and the Node scripts/tests             |
| `pnpm lint`          | ESLint (typed `strict` + `stylistic` rules)                          |
| `pnpm format`        | Prettier                                                             |
| `pnpm test`          | Unit tests (Vitest + jsdom)                                          |
| `pnpm test:coverage` | Unit tests with coverage thresholds                                  |
| `pnpm test:e2e`      | Builds, then runs the Playwright suite against the real extension    |
| `pnpm check`         | Typecheck + lint + format check + unit tests                         |

The first e2e run needs a browser: `pnpm exec playwright install chromium`. A pre-commit hook (Husky + lint-staged) lints and formats staged files and runs the typecheck. GitHub Actions runs everything above on every push and pull request, and uploads the packaged zip.

The version lives in `package.json` only; the build writes it into `dist/manifest.json`.

## Architecture

```
src/
  manifest.json                 # version is injected at build time
  background/                   # service worker: defaults, shortcut, toolbar badge
  popup/                        # settings popup
  shared/                       # settings model + stores, messages, command ids
  content/
    main.ts                     # composition root: wires everything below
    autoscroll/                 # AutoscrollController (when to move), skip policy, watch counter
    navigation/                 # FeedNavigator, advance strategies, NavigationState, UserNavigationMonitor
    tiktok/                     # everything that knows TikTok's DOM
      feedDom.ts                #   feed queries shared by every layout
      legacyTraitsReader.ts     #   per-card labels (Following feed)
      cinemaTraitsReader.ts     #   shared overlay labels (For You feed)
      nativeAutoscrollProbe.ts  #   TikTok's own autoscroll switch / flag
      markers.ts, selectors.ts
    playback/, interaction/, ui/
tests/
  fixtures/tiktokDom.ts         # markup mirroring both TikTok layouts
  unit/                         # Vitest
  e2e/                          # Playwright + a fake tiktok.com (fake-tiktok/)
```

Each class has one job and depends on small interfaces, so the controller is unit-tested with fakes. TikTok layouts plug in as `LayoutTraitsReader`s: supporting a new one means adding a reader to the list in `content/main.ts`, without touching the rest.

How a move works: the controller asks `FeedNavigator.advanceFrom(itemId)`. That call is idempotent: it does nothing if the feed already left that item, and waits while any move (the extension's or the user's) is still in flight, as recorded by `NavigationState`. That is what prevents the "two videos skipped" races.

## TikTok web DOM (checked Nov 2026)

TikTok serves two feed layouts. For You uses the **cinema** layout: media cards only hold the video, and one overlay shared by all cards shows the caption, labels and author of the active item. Following still uses the **legacy** layout, where every card carries its own overlay.

| Purpose                 | Selector                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Media card              | `[data-e2e="feed-video"]`, video id in `#xgwrapper-0-<id>`                                            |
| Next / previous         | `[data-e2e="feed-navigation-next"]`, `[data-e2e="feed-navigation-prev"]`                              |
| Ad                      | `[data-e2e="ad-tag"]` ("Publicidad"), `[data-e2e="ttam-ads-cta"]`                                     |
| Paid partnership        | `[data-e2e="sponsored-tag"]` ("Colaboración de pago")                                                 |
| LIVE                    | links to `/@user/live` or `/live`, `live` data-e2e tokens, "LIVE" / "En vivo" labels                  |
| Cinema overlay          | `[data-e2e="anchoring-chrome-host"]`; it names its video in `[data-more-menu-item-id]`                |
| TikTok's own autoscroll | `input[name="cinema-mode-autoscroll"]` (cinema) and `localStorage.auto_scroll` = `"1"` (both layouts) |
| Comments open           | `[data-e2e="comment-level-1"]`, `[data-e2e="comment-input"]`, `DivCommentListContainer`               |

Captions, hashtags and author names are ignored when looking for labels. While the cinema overlay still shows the previous video (it switches a moment after the scroll), its labels are not trusted. If TikTok changes its DOM, update `src/content/tiktok/` and the fixtures in `tests/fixtures/tiktokDom.ts`.

LIVE detection in the cinema layout could not be checked against a real LIVE item (none showed up in ~150 For You posts), so it relies on the same markers as the legacy layout.

## Debug

The extension runs in Chrome's isolated world, so its internals aren't reachable from the page console. To poke at the logic directly, run `pnpm build` and paste `dist/content.js` into the TikTok tab's DevTools console: without `chrome.*` APIs it runs with in-memory settings and exposes `window.__tas` (`state()`, `set({ enabled: true })`, `advance()`). Set `window.__tasDebug = true` first to log each advance and skip.

## Privacy

No data leaves your browser. Settings and the counter live in `chrome.storage.local`; there are no network requests, analytics or remote code.

## License

MIT
