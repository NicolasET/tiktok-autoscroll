import { describe, expect, it } from 'vitest';
import { TikTokNativeAutoscrollProbe } from '../../../../src/content/tiktok/nativeAutoscrollProbe';
import { cinemaFeed, legacyFeed, makePosts } from '../../../fixtures/tiktokDom';
import { mount } from '../../helpers';

function storageWith(value: string | null): Pick<Storage, 'getItem'> {
  return { getItem: (key) => (key === 'auto_scroll' ? value : null) };
}

describe('TikTokNativeAutoscrollProbe', () => {
  it('follows the cinema switch when it is on the page', () => {
    mount(cinemaFeed(makePosts('video'), 0, true));
    expect(new TikTokNativeAutoscrollProbe(document, () => storageWith('0')).isActive()).toBe(true);

    mount(cinemaFeed(makePosts('video'), 0, false));
    expect(new TikTokNativeAutoscrollProbe(document, () => storageWith('1')).isActive()).toBe(
      false,
    );
  });

  it('reads the stored flag when there is no switch (legacy layout)', () => {
    mount(legacyFeed(makePosts('video')));
    expect(new TikTokNativeAutoscrollProbe(document, () => storageWith('1')).isActive()).toBe(true);
    expect(new TikTokNativeAutoscrollProbe(document, () => storageWith('0')).isActive()).toBe(
      false,
    );
    expect(new TikTokNativeAutoscrollProbe(document, () => storageWith(null)).isActive()).toBe(
      false,
    );
  });

  it('treats unreadable storage as off', () => {
    mount(legacyFeed(makePosts('video')));
    const blocked = (): Pick<Storage, 'getItem'> => {
      throw new DOMException('blocked', 'SecurityError');
    };
    expect(new TikTokNativeAutoscrollProbe(document, blocked).isActive()).toBe(false);
  });
});
