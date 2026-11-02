import { CINEMA_SELECTORS, NATIVE_AUTOSCROLL_STORAGE_KEY } from './selectors';

export interface NativeAutoscrollProbe {
  isActive(): boolean;
}

/**
 * TikTok's own autoscroll. The cinema layout shows a switch for it; the legacy layout has no
 * switch but still follows the localStorage flag, which the switch updates immediately.
 */
export class TikTokNativeAutoscrollProbe implements NativeAutoscrollProbe {
  constructor(
    private readonly doc: Document,
    private readonly storage: () => Pick<Storage, 'getItem'>,
  ) {}

  isActive(): boolean {
    const toggle = this.doc.querySelector<HTMLInputElement>(
      CINEMA_SELECTORS.nativeAutoscrollSwitch,
    );
    return toggle ? toggle.checked : this.storedFlag() === '1';
  }

  /** localStorage can throw (blocked site data), which simply means "not active". */
  private storedFlag(): string | null {
    try {
      return this.storage().getItem(NATIVE_AUTOSCROLL_STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
