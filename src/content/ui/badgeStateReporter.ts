import { badgeStateMessage, type BadgeState, type BadgeStateMessage } from '../../shared/messages';
import type { AutoscrollMode } from '../autoscroll/status';

export type BadgeMessageSender = (message: BadgeStateMessage) => Promise<unknown>;

const BADGE_STATE_BY_MODE: Readonly<Record<AutoscrollMode, BadgeState>> = {
  off: 'off',
  on: 'on',
  waiting: 'on',
  native: 'native',
};

/** Tells the background which badge this tab needs, only when it changes. */
export class BadgeStateReporter {
  private reported: BadgeState | null = null;

  constructor(private readonly send: BadgeMessageSender) {}

  report(mode: AutoscrollMode): void {
    const state = BADGE_STATE_BY_MODE[mode];
    if (state === this.reported) return;
    this.reported = state;
    // If the service worker can't be reached, forget the state so the next status retries.
    const forget = (): void => {
      this.reported = null;
    };
    try {
      this.send(badgeStateMessage(state)).catch(forget);
    } catch {
      forget();
    }
  }
}
