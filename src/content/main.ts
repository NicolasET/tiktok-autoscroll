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
import { DEFAULT_NAVIGATION_TIMING, NavigationState } from './navigation/navigationState';
import { UserNavigationMonitor } from './navigation/userNavigationMonitor';
import { PlaybackEvents } from './playback/playbackEvents';
import { SettingsCache } from './settingsCache';
import { CinemaTraitsReader } from './tiktok/cinemaTraitsReader';
import { FeedDom } from './tiktok/feedDom';
import { LegacyTraitsReader } from './tiktok/legacyTraitsReader';
import { TikTokNativeAutoscrollProbe } from './tiktok/nativeAutoscrollProbe';
import { LayoutAwareTraitsReader } from './tiktok/traits';
import { BadgeStateReporter, type BadgeMessageSender } from './ui/badgeStateReporter';
import { FloatingButton } from './ui/floatingButton';

const TICK_MS = 400;
const INTERACTION_WINDOW_MS = 2500;
const WATCHED_AFTER_MS = 3000;

/** chrome.* is missing when the bundle runs pasted in the page's DevTools console. */
function extensionApi(): Partial<typeof chrome> | undefined {
  return (globalThis as { chrome?: Partial<typeof chrome> }).chrome;
}

function createSettingsStore(): SettingsStore {
  const storage = extensionApi()?.storage;
  return storage ? new ChromeSettingsStore(storage) : new MemorySettingsStore();
}

function createBadgeMessageSender(): BadgeMessageSender {
  const runtime = extensionApi()?.runtime;
  return runtime ? (message) => runtime.sendMessage(message) : () => Promise.resolve();
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
  const navigation = new NavigationState(clock, DEFAULT_NAVIGATION_TIMING);
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
  const native = new TikTokNativeAutoscrollProbe(document, () => window.localStorage);
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
    native,
    counter,
    clock,
    log,
  });
  const floatingButton = new FloatingButton(document, () => {
    settings.update({ enabled: !settings.current.enabled });
  });
  const badge = new BadgeStateReporter(createBadgeMessageSender());

  controller.onStatus((status) => {
    floatingButton.render({
      visible: settings.current.showFloating && status.onFeed,
      mode: status.mode,
      watchedCount: status.watchedCount,
    });
    badge.report(status.mode);
  });

  await settings.load();
  settings.watch((changes) => {
    if (changes.enabled === false) controller.cancel();
    else controller.refresh();
  });
  interaction.start();
  new PlaybackEvents(document, feed).start(controller);
  const userNavigation = new UserNavigationMonitor(window, feed, navigation, log);
  userNavigation.onNavigate(() => {
    controller.onUserNavigation();
  });
  userNavigation.start();
  window.__tas = createDebugHandle({
    settings,
    feed,
    traits,
    navigator,
    controller,
    interaction,
    native,
  });

  controller.refresh();
  window.setInterval(() => {
    controller.tick();
  }, TICK_MS);
}

if (!window.__tasLoaded) {
  window.__tasLoaded = true;
  void start();
}
