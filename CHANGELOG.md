# Changelog

## 1.1.0

### Fixed

- Ads and LIVEs are detected again on For You: TikTok moved their labels into an overlay shared by every video. The older per-video layout (still used by Following) keeps working.
- Clicking "next" right when a video ended, or while an ad was being skipped, no longer skips an extra video.
- An advance requested by a video that ended right after the page loaded is no longer dropped.

### Changed

- When TikTok's own autoscroll ("Pasar automáticamente") is on, the extension stands aside completely and resumes once it is turned off. The floating button shows "TikTok auto" and the toolbar badge shows `TT`.
- Paid partnerships ("Colaboración de pago") are no longer treated as ads. A new popup option, off by default, skips them.
- Requires Chrome 120 or newer.

### Internal

- Rewritten in TypeScript as small single-purpose modules, bundled with esbuild into `dist/`.
- Unit tests (Vitest), end-to-end tests against the built extension (Playwright), ESLint, Prettier, a pre-commit hook and GitHub Actions CI.

## 1.0.0

- First release.
