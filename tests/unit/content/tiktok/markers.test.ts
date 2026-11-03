import { describe, expect, it } from 'vitest';
import {
  hasAdMarker,
  hasLiveMarker,
  hasPaidPartnershipMarker,
  type MarkerScope,
} from '../../../../src/content/tiktok/markers';
import { SELECTORS } from '../../../../src/content/tiktok/selectors';

function scope(html: string): MarkerScope {
  const root = document.createElement('div');
  root.innerHTML = html;
  return { root, ignore: SELECTORS.description };
}

describe('hasAdMarker', () => {
  it.each([
    ['the ad tag', '<div data-e2e="ad-tag"><span>Publicidad</span></div>'],
    ['the ad call-to-action', '<a data-e2e="ttam-ads-cta" href="#">Más información</a>'],
    ['a "Publicidad" label', '<span>Publicidad</span>'],
    ['a "Sponsored" label', '<strong>Sponsored</strong>'],
  ])('detects %s', (_, html) => {
    expect(hasAdMarker(scope(html))).toBe(true);
  });

  it.each([
    ['caption hashtags', '<div data-e2e="video-desc"><a href="/tag/ad"><p>Ad</p></a></div>'],
    ['author names', '<a href="/@ad"><p>Ad</p></a>'],
    ['paid partnerships', '<div data-e2e="sponsored-tag"><span>Colaboración de pago</span></div>'],
    ['ids that only contain "ad"', '<i data-e2e="upload-icon"></i><i data-e2e="download-btn"></i>'],
    ['long texts', '<span>Publicidad engañosa en redes sociales</span>'],
    ['labels with children', '<div>Publicidad<span>!</span></div>'],
  ])('ignores %s', (_, html) => {
    expect(hasAdMarker(scope(html))).toBe(false);
  });
});

describe('hasPaidPartnershipMarker', () => {
  it.each([
    ['the sponsored tag', '<div data-e2e="sponsored-tag"><span>x</span></div>'],
    ['a "Colaboración de pago" label', '<span>Colaboración de pago</span>'],
    ['a "Paid partnership" label', '<span>Paid partnership</span>'],
  ])('detects %s', (_, html) => {
    expect(hasPaidPartnershipMarker(scope(html))).toBe(true);
  });

  it('ignores ads', () => {
    expect(hasPaidPartnershipMarker(scope('<div data-e2e="ad-tag">Publicidad</div>'))).toBe(false);
  });
});

describe('hasLiveMarker', () => {
  it.each([
    ['a link to a creator LIVE', '<a href="/@creator/live"><img alt="" /></a>'],
    ['a link to the LIVE hub', '<a href="https://www.tiktok.com/live"><img alt="" /></a>'],
    ['a live data-e2e', '<div data-e2e="live-badge"></div>'],
    ['a "LIVE" label', '<span>LIVE</span>'],
    ['an "En vivo" label', '<p>En vivo</p>'],
  ])('detects %s', (_, html) => {
    expect(hasLiveMarker(scope(html))).toBe(true);
  });

  it.each([
    [
      'captions',
      '<div data-e2e="video-desc"><a href="/@creator/live"><p>LIVE</p></a><span>en vivo</span></div>',
    ],
    ['hashtag pages', '<a href="/tag/live"><img alt="" /></a>'],
    ['creators whose name contains live', '<a href="/@livestreamer"><img alt="" /></a>'],
    ['authors called "Live"', '<a href="/@someone"><p>Live</p></a>'],
    ['ids that only contain "live"', '<div data-e2e="delivery-info"></div>'],
  ])('ignores %s', (_, html) => {
    expect(hasLiveMarker(scope(html))).toBe(false);
  });
});
