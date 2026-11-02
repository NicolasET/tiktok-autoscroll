import type { Clock } from '../../src/content/clock';
import { SELECTORS } from '../../src/content/tiktok/selectors';

export interface ManualClock extends Clock {
  advance(ms: number): void;
}

export function manualClock(start = 1_000_000): ManualClock {
  let now = start;
  return {
    now: () => now,
    advance(ms) {
      now += ms;
    },
  };
}

export function mount(html: string): void {
  document.body.innerHTML = html;
}

export function cardAt(index: number): HTMLElement {
  const card = document.querySelectorAll<HTMLElement>(SELECTORS.mediaCard)[index];
  if (!card) throw new Error(`No media card at index ${index}`);
  return card;
}

export function videoAt(index: number): HTMLVideoElement {
  const video = cardAt(index).querySelector('video');
  if (!video) throw new Error(`Media card ${index} has no video`);
  return video;
}

/** jsdom never plays media, so fake the state the feed reads. */
export function markPlaying(video: HTMLVideoElement): void {
  Object.defineProperty(video, 'paused', { configurable: true, value: false });
  Object.defineProperty(video, 'readyState', { configurable: true, value: 4 });
}

/** jsdom has no layout: give an element a box so visibility checks see it. */
export function stubRect(element: Element, rect: Partial<DOMRect>): void {
  const box = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, ...rect };
  element.getBoundingClientRect = () => ({ ...box, toJSON: () => box });
}

export function byE2e(value: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-e2e="${value}"]`);
  if (!element) throw new Error(`No element with data-e2e="${value}"`);
  return element;
}
