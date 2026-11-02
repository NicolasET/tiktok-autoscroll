type ActionApi = Pick<typeof chrome.action, 'setBadgeText' | 'setBadgeBackgroundColor'>;

const ON_TEXT = 'ON';
const ON_COLOR = '#6366f1';

/** Toolbar badge: "ON" while autoscroll is enabled. */
export class BadgePresenter {
  constructor(private readonly action: ActionApi) {}

  async showGlobal(enabled: boolean): Promise<void> {
    await Promise.all([
      this.action.setBadgeText({ text: enabled ? ON_TEXT : '' }),
      this.action.setBadgeBackgroundColor({ color: ON_COLOR }),
    ]);
  }
}
