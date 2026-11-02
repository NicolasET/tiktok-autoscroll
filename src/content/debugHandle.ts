import type { Settings, SettingsPatch } from '../shared/settings';
import type { AutoscrollController } from './autoscroll/autoscrollController';
import type { InteractionSource } from './interaction/interactionTracker';
import type { FeedNavigator } from './navigation/feedNavigator';
import type { SettingsCache } from './settingsCache';
import type { FeedDom } from './tiktok/feedDom';
import type { LayoutAwareTraitsReader } from './tiktok/traits';

/** Console helpers, reachable as window.__tas when the bundle is pasted into DevTools. */
export interface DebugHandle {
  readonly settings: Settings;
  set(patch: SettingsPatch): void;
  advance(): void;
  state(): Record<string, unknown>;
}

declare global {
  interface Window {
    __tasLoaded?: boolean;
    __tasDebug?: boolean;
    __tas?: DebugHandle;
  }
}

export interface DebugHandleDeps {
  readonly settings: SettingsCache;
  readonly feed: FeedDom;
  readonly traits: LayoutAwareTraitsReader;
  readonly navigator: FeedNavigator;
  readonly controller: AutoscrollController;
  readonly interaction: InteractionSource;
}

export function createDebugHandle(deps: DebugHandleDeps): DebugHandle {
  return {
    get settings() {
      return deps.settings.current;
    },
    set(patch) {
      deps.settings.update(patch);
    },
    advance() {
      const item = deps.feed.activeItem();
      if (item) deps.navigator.advanceFrom(item.id, 'manual');
    },
    state() {
      const item = deps.feed.activeItem();
      return {
        status: deps.controller.status(),
        layout: deps.traits.layout(),
        activeItem: item?.id ?? null,
        traits: item ? deps.traits.read(item) : null,
        interacting: deps.interaction.isInteracting(),
        commentsOpen: deps.feed.commentsOpen(),
      };
    },
  };
}
