import type { BadgeState } from '../shared/messages';

type ActionApi = Pick<
  typeof chrome.action,
  'setBadgeText' | 'setBadgeBackgroundColor' | 'setBadgeTextColor' | 'setTitle'
>;

interface BadgePresentation {
  readonly text: string;
  readonly background: string;
  readonly foreground: string;
  readonly title: string;
}

const DEFAULT_TITLE = 'Autoscroll for TikTok';

const PRESENTATION: Readonly<Record<BadgeState, BadgePresentation>> = {
  off: { text: '', background: '#6366f1', foreground: '#ffffff', title: DEFAULT_TITLE },
  on: { text: 'ON', background: '#6366f1', foreground: '#ffffff', title: DEFAULT_TITLE },
  native: {
    text: 'TT',
    background: '#25f4ee',
    foreground: '#000000',
    title: `${DEFAULT_TITLE}: en pausa porque el autoscroll de TikTok está activo`,
  },
};

/**
 * Toolbar badge. The global badge follows the "enabled" setting; TikTok tabs report their
 * own state (e.g. "TT" while TikTok's autoscroll is on), which overrides it for that tab.
 */
export class BadgePresenter {
  constructor(private readonly action: ActionApi) {}

  async showGlobal(enabled: boolean): Promise<void> {
    await this.apply(PRESENTATION[enabled ? 'on' : 'off'], {});
  }

  async showForTab(tabId: number, state: BadgeState): Promise<void> {
    await this.apply(PRESENTATION[state], { tabId });
  }

  private async apply(presentation: BadgePresentation, target: { tabId?: number }): Promise<void> {
    await Promise.all([
      this.action.setBadgeText({ ...target, text: presentation.text }),
      this.action.setBadgeBackgroundColor({ ...target, color: presentation.background }),
      this.action.setBadgeTextColor({ ...target, color: presentation.foreground }),
      this.action.setTitle({ ...target, title: presentation.title }),
    ]);
  }
}
