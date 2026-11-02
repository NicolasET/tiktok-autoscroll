/* Autoscroll for TikTok — content script (composition root).
 * Without chrome.* APIs it falls back to in-memory settings, so dist/content.js can be
 * pasted into the DevTools console of a TikTok tab to poke at it (see window.__tas).
 */
import { ChromeSettingsStore } from '../shared/chromeSettingsStore';
import { MemorySettingsStore } from '../shared/memorySettingsStore';
import type { SettingsStore } from '../shared/settingsStore';
import { AutoscrollController } from './autoscroll/autoscrollController';
import { WatchCounter } from './autoscroll/watchCounter';
import { systemClock } from './clock';
import { createDebugHandle } from './debugHandle';
import { InteractionTracker } from './interaction/interactionTracker';
import { createDebugLogger } from './log';
import {
  ArrowDownKeyStrategy,
  NextButtonStrategy,
  ScrollIntoViewStrategy,
} from './navigation/advanceStrategies';
import { FeedNavigator } from './navigation/feedNavigator';
import { NavigationState, type NavigationTiming } from './navigation/navigationState';
import { PlaybackEvents } from './playback/playbackEvents';
import { SettingsCache } from './settingsCache';
import { CinemaTraitsReader } from './tiktok/cinemaTraitsReader';
import { FeedDom } from './tiktok/feedDom';
import { LegacyTraitsReader } from './tiktok/legacyTraitsReader';
import { LayoutAwareTraitsReader } from './tiktok/traits';
import { FloatingButton } from './ui/floatingButton';

const TICK_MS = 400;
const INTERACTION_WINDOW_MS = 2500;
const WATCHED_AFTER_MS = 3000;
const NAVIGATION_TIMING: NavigationTiming = { advanceTimeoutMs: 1500, arrivalGuardMs: 500 };

function createSettingsStore(): SettingsStore {
  const api = (globalThis as { chrome?: Partial<typeof chrome> }).chrome;
  return api?.storage ? new ChromeSettingsStore(api.storage) : new MemorySettingsStore();
}

async function start(): Promise<void> {
  const clock = systemClock;
  const log = createDebugLogger(() => window.__tasDebug === true);
  const settings = new SettingsCache(createSettingsStore());

  const feed = new FeedDom(document);
  const traits = new LayoutAwareTraitsReader([
    new CinemaTraitsReader(document),
    new LegacyTraitsReader(),
  ]);
  const navigation = new NavigationState(clock, NAVIGATION_TIMING);
  const navigator = new FeedNavigator(
    feed,
    navigation,
    [
      new NextButtonStrategy(feed),
      new ScrollIntoViewStrategy(feed),
      new ArrowDownKeyStrategy(document),
    ],
    log,
  );
  const interaction = new InteractionTracker(document, feed, clock, INTERACTION_WINDOW_MS);
  const counter = new WatchCounter(WATCHED_AFTER_MS, () => {
    settings.update({ watchedCount: settings.current.watchedCount + 1 });
  });
  const controller = new AutoscrollController({
    settings: () => settings.current,
    feed,
    traits,
    navigator,
    navigation,
    interaction,
    counter,
    clock,
    log,
  });
  const floatingButton = new FloatingButton(document, () => {
    settings.update({ enabled: !settings.current.enabled });
  });

  controller.onStatus((status) => {
    floatingButton.render({
      visible: settings.current.showFloating && status.onFeed,
      mode: status.mode,
      watchedCount: status.watchedCount,
    });
  });

  await settings.load();
  settings.watch((changes) => {
    if (changes.enabled === false) controller.cancel();
    else controller.refresh();
  });
  interaction.start();
  new PlaybackEvents(document, feed).start(controller);
  window.__tas = createDebugHandle({ settings, feed, traits, navigator, controller, interaction });

  controller.refresh();
  window.setInterval(() => {
    controller.tick();
  }, TICK_MS);
}

if (!window.__tasLoaded) {
  window.__tasLoaded = true;
  void start();
}
