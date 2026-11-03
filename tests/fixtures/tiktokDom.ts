/**
 * Markup that mirrors TikTok web's feed (checked against tiktok.com in Nov 2026), trimmed to
 * the attributes the extension relies on. Shared by the unit tests and the e2e fake page.
 */

export type PostKind = 'video' | 'ad' | 'paid-partnership' | 'live' | 'photo';

export type FeedLayout = 'legacy' | 'cinema';

/** Configuration of the e2e fake feed (tests/e2e/fake-tiktok). */
export interface FakeFeedConfig {
  readonly layout: FeedLayout;
  readonly posts: readonly Post[];
  /** How long TikTok takes to scroll to another item after "next"/"previous". */
  readonly transitionMs: number;
  /** How long the cinema overlay lags behind the scroll. */
  readonly overlayLagMs: number;
}

export interface Post {
  readonly id: string;
  readonly kind: PostKind;
  readonly author: string;
}

export function makePost(kind: PostKind, index: number): Post {
  return {
    id: `76900000000000000${String(index).padStart(2, '0')}`,
    kind,
    author: `creator${index}`,
  };
}

export function makePosts(...kinds: readonly PostKind[]): Post[] {
  return kinds.map((kind, index) => makePost(kind, index));
}

/** Captions often mention #live or #ad; they must never count as labels. */
function caption(post: Post): string {
  return `
    <div data-e2e="multiline-text-content">
      <div data-e2e="video-desc">
        <a data-e2e="search-common-link" href="/tag/live"><p>#live</p></a>
        <a data-e2e="search-common-link" href="/tag/ad"><p>#ad</p></a>
        <span data-e2e="desc-span-0_1">LIVE</span>
        <span data-e2e="desc-span-0_3">by ${post.author}</span>
      </div>
    </div>`;
}

function itemTags(post: Post): string {
  switch (post.kind) {
    case 'ad':
      return '<div data-e2e="ad-tag"><span>Publicidad</span></div>';
    case 'paid-partnership':
      return '<div data-e2e="sponsored-tag"><span>Colaboración de pago</span></div>';
    default:
      return '';
  }
}

function leadingTags(post: Post): string {
  return post.kind === 'live'
    ? `<a href="/@${post.author}/live"><span>LIVE</span></a>`
    : '<a href="/place/123"><div data-e2e="poi-tag">Cd Madero</div></a>';
}

function adFooter(post: Post): string {
  return post.kind === 'ad'
    ? `<div data-e2e="anchoring-description-footer">
         <a data-e2e="ttam-ads-cta" href="https://advertiser.example/">Más información</a>
       </div>`
    : '';
}

function player(post: Post): string {
  return post.kind === 'photo'
    ? '<div class="photo-carousel"><img alt="" /></div>'
    : `<div id="xgwrapper-0-${post.id}"><div><video muted playsinline></video></div></div>`;
}

function authorLink(post: Post): string {
  return `<a href="/@${post.author}"><p>${post.author}</p></a>`;
}

/** TikTok puts a zero-width space inside "automáticamente". */
const ZERO_WIDTH_SPACE = '\u200b';

function navigation(wrapperAttributes: string): string {
  return `
    <div ${wrapperAttributes}>
      <button type="button" data-e2e="feed-navigation-prev" aria-label="Ir al vídeo anterior">↑</button>
      <button type="button" data-e2e="feed-navigation-next" aria-label="Ir al siguiente vídeo" aria-disabled="false">↓</button>
    </div>`;
}

// ---------- legacy layout (Following feed): every card carries its own overlay ----------

function legacyArticle(post: Post, index: number): string {
  return `
    <article id="one-column-item-${index}" data-e2e="recommend-list-item-container" data-scroll-index="${index}">
      <div class="DivContentFlexLayout">
        <section id="media-card-${index}" data-e2e="feed-video" aria-label="Ver en pantalla completa" tabindex="0">
          <div class="DivVideoPlayerContainer">${player(post)}</div>
          <div class="DivMediaCardOverlay">
            <div class="DivCaptionContainer"></div>
            <div class="DivOverlayBottomLeadingTagsContainer">${leadingTags(post)}</div>
            <div class="DivItemTagsContainer">${itemTags(post)}</div>
            <div class="DivCreatorInfoContainer">${authorLink(post)}</div>
            ${caption(post)}
          </div>
        </section>
        <section class="SectionActionBarContainer">
          <a data-e2e="video-author-avatar" href="/@${post.author}"><img alt="" /></a>
          <div data-e2e="like-icon" role="button"><strong data-e2e="like-count">23.4K</strong></div>
        </section>
      </div>
    </article>`;
}

export function legacyFeed(posts: readonly Post[]): string {
  return `
    <main id="main-content-homepage_follow">
      <div id="column-list-container">${posts.map(legacyArticle).join('')}</div>
      ${navigation('class="DivFeedNavigationContainer"')}
    </main>`;
}

// ---------- cinema layout (For You): cards only hold the video, one shared overlay ----------

function cinemaArticle(post: Post, index: number): string {
  return `
    <article id="one-column-item-${index}" data-e2e="recommend-list-item-container" data-scroll-index="${index}">
      <div data-e2e="anchoring-ambient"></div>
      <div class="DivContentFlexLayout">
        <section id="media-card-${index}" data-e2e="feed-video" aria-label="Ver en pantalla completa" tabindex="0">
          <div class="DivVideoPlayerContainer">${player(post)}</div>
        </section>
      </div>
    </article>`;
}

/** Inner markup of the shared description layer for `post`. */
export function cinemaDescription(post: Post): string {
  return `
    <div class="DivDescriptionContent">
      <div class="DivCaptionContainer"></div>
      <div class="DivOverlayBottomLeadingTagsContainer">${leadingTags(post)}</div>
      <div class="DivItemTagsContainer">${itemTags(post)}</div>
      <div data-e2e="cinema-creator-identity">
        <div data-e2e="cinema-creator-avatar">
          <a data-e2e="video-author-avatar" href="/@${post.author}"><img alt="" /></a>
        </div>
        ${authorLink(post)}
      </div>
      ${caption(post)}
      ${adFooter(post)}
    </div>`;
}

export function cinemaFeed(
  posts: readonly Post[],
  activeIndex = 0,
  nativeAutoscroll = false,
): string {
  const active = posts[activeIndex];
  if (!active) throw new Error(`No post at index ${activeIndex}`);
  return `
    <main id="main-content-homepage_hot">
      <div data-e2e="anchoring-player-column">
        <div id="column-list-container">${posts.map(cinemaArticle).join('')}</div>
        <div data-e2e="anchoring-chrome-host">
          <div class="DivChromeWheelRoot">
            <div data-e2e="anchoring-engagement-vertical">
              <div data-e2e="like-icon" role="button"><strong data-e2e="like-count">23.4K</strong></div>
            </div>
            <div data-e2e="anchoring-description-layer">${cinemaDescription(active)}</div>
            <div data-e2e="anchoring-playback-chrome">
              <button type="button" data-e2e="more-menu-icon" data-more-menu-item-id="${active.id}">…</button>
              <div data-e2e="cinema-playback-control-autoscroll">
                <label for="native-autoscroll">Pasar auto${ZERO_WIDTH_SPACE}máticamente</label>
                <input type="checkbox" id="native-autoscroll" name="cinema-mode-autoscroll" ${nativeAutoscroll ? 'checked' : ''} />
              </div>
            </div>
          </div>
        </div>
        ${navigation('data-e2e="anchoring-scroll-controls"')}
      </div>
    </main>`;
}
