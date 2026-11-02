/**
 * A stand-in for tiktok.com's feed, served at https://www.tiktok.com/ during e2e tests so the
 * real extension runs against it. It reproduces the TikTok behaviour the extension depends on:
 * - every "next" is honoured, so two quick clicks move two items (the double-skip bug);
 * - moves take a while, and the cinema overlay switches a moment after the scroll;
 * - an ended video replays, unless TikTok's own autoscroll is on, which then moves on.
 */
// The .ts extension lets the Node project (e2e support) type-check this file too.
import {
  cinemaDescription,
  cinemaFeed,
  legacyFeed,
  type FakeFeedConfig,
} from '../../fixtures/tiktokDom.ts';

export interface FakeTikTokApi {
  activeIndex(): number;
  /** Clicks on "next" that did not come from the user (i.e. from the extension). */
  syntheticNextClicks(): number;
  endActiveVideo(): void;
}

declare global {
  interface Window {
    __FAKE_FEED_CONFIG__?: FakeFeedConfig;
    fakeTikTok?: FakeTikTokApi;
  }
}

const NATIVE_AUTOSCROLL_FLAG = 'auto_scroll';
const NATIVE_ADVANCE_DELAY_MS = 175;

const STYLES = `
  html, body { margin: 0; height: 100%; overflow: hidden; font: 14px sans-serif; }
  #column-list-container { height: 100vh; overflow-y: scroll; }
  article, .DivContentFlexLayout, [data-e2e="feed-video"] { height: 100vh; }
  video, .photo-carousel { display: block; width: 100%; height: 70vh; background: #222; }
  [data-e2e="anchoring-chrome-host"] { position: fixed; left: 0; bottom: 0; width: 60vw; }
  [data-e2e="anchoring-scroll-controls"], .DivFeedNavigationContainer {
    position: fixed; top: 24px; right: 24px; z-index: 10;
    display: flex; flex-direction: column; gap: 8px;
  }
`;

class FakeTikTok implements FakeTikTokApi {
  private index = 0;
  private target = 0;
  private synthetic = 0;

  constructor(private readonly config: FakeFeedConfig) {}

  mount(): void {
    document.head.insertAdjacentHTML('beforeend', `<style>${STYLES}</style>`);
    document.body.innerHTML =
      this.config.layout === 'cinema'
        ? cinemaFeed(this.config.posts, 0, storedNativeFlag())
        : legacyFeed(this.config.posts);

    this.element('[data-e2e="feed-navigation-next"]').addEventListener('click', (event) => {
      if (!event.isTrusted) this.synthetic += 1;
      this.move(1);
    });
    this.element('[data-e2e="feed-navigation-prev"]').addEventListener('click', () => {
      this.move(-1);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') this.move(1);
      if (event.key === 'ArrowUp') this.move(-1);
    });
    document
      .querySelector<HTMLInputElement>('input[name="cinema-mode-autoscroll"]')
      ?.addEventListener('change', (event) => {
        const { checked } = event.target as HTMLInputElement;
        localStorage.setItem(NATIVE_AUTOSCROLL_FLAG, checked ? '1' : '0');
      });
  }

  activeIndex(): number {
    return this.index;
  }

  syntheticNextClicks(): number {
    return this.synthetic;
  }

  endActiveVideo(): void {
    const video = document
      .querySelectorAll('[data-e2e="feed-video"]')
      [this.index]?.querySelector('video');
    video?.dispatchEvent(new Event('ended'));
    if (storedNativeFlag()) {
      setTimeout(() => {
        this.move(1);
      }, NATIVE_ADVANCE_DELAY_MS);
    }
  }

  /** Queues the move like TikTok does: clicks during a transition add up. */
  private move(delta: number): void {
    this.target = Math.min(this.config.posts.length - 1, Math.max(0, this.target + delta));
    const target = this.target;
    setTimeout(() => {
      this.show(target);
    }, this.config.transitionMs);
  }

  private show(index: number): void {
    this.index = index;
    const column = this.element('#column-list-container');
    column.scrollTop = index * column.clientHeight;
    if (this.config.layout === 'cinema') {
      setTimeout(() => {
        this.updateOverlay(index);
      }, this.config.overlayLagMs);
    }
  }

  private updateOverlay(index: number): void {
    const post = this.config.posts[index];
    if (!post) return;
    this.element('[data-e2e="anchoring-description-layer"]').innerHTML = cinemaDescription(post);
    this.element('[data-more-menu-item-id]').setAttribute('data-more-menu-item-id', post.id);
  }

  private element(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Fake TikTok is missing ${selector}`);
    return element;
  }
}

function storedNativeFlag(): boolean {
  return localStorage.getItem(NATIVE_AUTOSCROLL_FLAG) === '1';
}

const config = window.__FAKE_FEED_CONFIG__;
if (!config) throw new Error('window.__FAKE_FEED_CONFIG__ is missing');
const fake = new FakeTikTok(config);
fake.mount();
window.fakeTikTok = fake;
