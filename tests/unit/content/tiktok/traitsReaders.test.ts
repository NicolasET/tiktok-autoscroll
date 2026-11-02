import { describe, expect, it } from 'vitest';
import { CinemaTraitsReader } from '../../../../src/content/tiktok/cinemaTraitsReader';
import { FeedDom, type FeedItem } from '../../../../src/content/tiktok/feedDom';
import { LegacyTraitsReader } from '../../../../src/content/tiktok/legacyTraitsReader';
import { LayoutAwareTraitsReader, type ItemTraits } from '../../../../src/content/tiktok/traits';
import {
  cinemaFeed,
  legacyFeed,
  makePosts,
  type Post,
  type PostKind,
} from '../../../fixtures/tiktokDom';
import { byE2e, cardAt, mount } from '../../helpers';

const NONE: ItemTraits = { ad: false, paidPartnership: false, live: false };

const EXPECTED: Readonly<Record<PostKind, ItemTraits>> = {
  video: NONE,
  photo: NONE,
  ad: { ...NONE, ad: true },
  'paid-partnership': { ...NONE, paidPartnership: true },
  live: { ...NONE, live: true },
};

function itemAt(index: number): FeedItem {
  const item = new FeedDom(document).itemOf(cardAt(index));
  if (!item) throw new Error('missing item');
  return item;
}

const layouts = [
  {
    name: 'legacy',
    mountFeed: (posts: readonly Post[]) => {
      mount(legacyFeed(posts));
    },
    reader: () => new LegacyTraitsReader(),
  },
  {
    name: 'cinema',
    mountFeed: (posts: readonly Post[], active: number) => {
      mount(cinemaFeed(posts, active));
    },
    reader: () => new CinemaTraitsReader(document),
  },
] as const;

describe.each(layouts)('$name layout', ({ mountFeed, reader }) => {
  it.each(Object.keys(EXPECTED) as PostKind[])('reads the traits of a %s post', (kind) => {
    mountFeed(makePosts('video', kind, 'video'), 1);
    expect(reader().read(itemAt(1))).toEqual(EXPECTED[kind]);
  });
});

describe('CinemaTraitsReader', () => {
  it('waits while the shared overlay still shows another post', () => {
    mount(cinemaFeed(makePosts('ad', 'video'), 0));
    expect(new CinemaTraitsReader(document).read(itemAt(1))).toBeNull();
  });

  it('trusts the overlay when it does not name a post', () => {
    mount(cinemaFeed(makePosts('video', 'ad'), 1));
    byE2e('more-menu-icon').removeAttribute('data-more-menu-item-id');
    expect(new CinemaTraitsReader(document).read(itemAt(1))?.ad).toBe(true);
  });

  it('only supports pages with the shared overlay', () => {
    mount(legacyFeed(makePosts('video')));
    expect(new CinemaTraitsReader(document).supports()).toBe(false);
    expect(new CinemaTraitsReader(document).read(itemAt(0))).toBeNull();
  });
});

describe('LayoutAwareTraitsReader', () => {
  const traits = (): LayoutAwareTraitsReader =>
    new LayoutAwareTraitsReader([new CinemaTraitsReader(document), new LegacyTraitsReader()]);

  it('uses the cinema reader when its overlay is on the page', () => {
    mount(cinemaFeed(makePosts('video', 'ad'), 1));
    expect(traits().layout()).toBe('cinema');
    expect(traits().read(itemAt(1))?.ad).toBe(true);
  });

  it('falls back to the legacy reader', () => {
    mount(legacyFeed(makePosts('video', 'ad')));
    expect(traits().layout()).toBe('legacy');
    expect(traits().read(itemAt(1))?.ad).toBe(true);
  });

  it('returns nothing when no reader supports the page', () => {
    mount(legacyFeed(makePosts('video')));
    const empty = new LayoutAwareTraitsReader([]);
    expect(empty.layout()).toBeNull();
    expect(empty.read(itemAt(0))).toBeNull();
  });
});
