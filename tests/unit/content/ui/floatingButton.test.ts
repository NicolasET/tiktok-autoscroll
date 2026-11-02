import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AutoscrollMode } from '../../../../src/content/autoscroll/status';
import { FloatingButton } from '../../../../src/content/ui/floatingButton';

function fab(): HTMLButtonElement {
  const button = document.getElementById('tas-fab');
  if (!(button instanceof HTMLButtonElement)) throw new Error('floating button missing');
  return button;
}

describe('FloatingButton', () => {
  let onToggle: Mock<() => void>;
  let button: FloatingButton;

  beforeEach(() => {
    document.body.innerHTML = '';
    onToggle = vi.fn<() => void>();
    button = new FloatingButton(document, onToggle);
  });

  it.each([
    ['off', 'Auto off', null, 'false'],
    ['on', 'Auto on', 'tas-on', 'true'],
    ['waiting', 'En espera', 'tas-wait', 'true'],
    ['native', 'TikTok auto', 'tas-native', 'true'],
  ] as const)('shows the %s mode', (mode: AutoscrollMode, label, className, pressed) => {
    button.render({ visible: true, mode, watchedCount: 7 });
    expect(fab().textContent).toBe(`${label}7`);
    expect(fab().getAttribute('aria-pressed')).toBe(pressed);
    expect([...fab().classList]).toEqual(className ? [className] : []);
  });

  it('explains why it is paused while TikTok autoscroll is on', () => {
    button.render({ visible: true, mode: 'native', watchedCount: 0 });
    expect(fab().title).toMatch(/autoscroll de TikTok/);
  });

  it('swaps state classes between renders', () => {
    button.render({ visible: true, mode: 'waiting', watchedCount: 0 });
    button.render({ visible: true, mode: 'on', watchedCount: 0 });
    expect([...fab().classList]).toEqual(['tas-on']);
  });

  it('hides and shows itself without recreating the element', () => {
    button.render({ visible: true, mode: 'on', watchedCount: 0 });
    const element = fab();
    button.render({ visible: false, mode: 'on', watchedCount: 0 });
    expect(element.hidden).toBe(true);
    button.render({ visible: true, mode: 'on', watchedCount: 0 });
    expect(fab()).toBe(element);
    expect(element.hidden).toBe(false);
  });

  it('is not created until it has to be shown', () => {
    button.render({ visible: false, mode: 'on', watchedCount: 0 });
    expect(document.getElementById('tas-fab')).toBeNull();
  });

  it('comes back if the page removes it', () => {
    button.render({ visible: true, mode: 'on', watchedCount: 0 });
    fab().remove();
    button.render({ visible: true, mode: 'on', watchedCount: 0 });
    expect(document.getElementById('tas-fab')).not.toBeNull();
  });

  it('toggles autoscroll on click without letting TikTok see the click', () => {
    const pageHandler = vi.fn();
    document.body.addEventListener('click', pageHandler);
    button.render({ visible: true, mode: 'off', watchedCount: 0 });
    fab().click();
    expect(onToggle).toHaveBeenCalledOnce();
    expect(pageHandler).not.toHaveBeenCalled();
  });
});
