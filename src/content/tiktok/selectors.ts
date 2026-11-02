/** TikTok web selectors shared by every feed layout. See the README for where each one comes from. */
export const SELECTORS = {
  mediaCard: '[data-e2e="feed-video"]',
  /** Where hovering counts as interacting: the media card, plus the cinema layout's column (overlay, arrows). */
  playerArea: '[data-e2e="feed-video"], [data-e2e="anchoring-player-column"]',
  playerWrapper: '[id^="xgwrapper-"]',
  nextButton: '[data-e2e="feed-navigation-next"]',
  prevButton: '[data-e2e="feed-navigation-prev"]',
  description: [
    '[data-e2e="video-desc"]',
    '[data-e2e^="desc-span"]',
    '[data-e2e="multiline-text-content"]',
  ].join(', '),
  authorLink: 'a[href^="/@"]',
  comments: [
    '[data-e2e="comment-level-1"]',
    '[data-e2e="comment-list"]',
    '[data-e2e="search-comment-container"]',
    '[data-e2e="comment-input"]',
    '[class*="DivCommentListContainer"]',
    '[class*="DivCommentContainer"]',
  ].join(', '),
} as const;

/** Cinema layout (For You since late 2026): one overlay shared by every media card. */
export const CINEMA_SELECTORS = {
  overlay: '[data-e2e="anchoring-chrome-host"]',
  creatorIdentity: '[data-e2e="cinema-creator-identity"]',
} as const;

/** The overlay's "more" button names the video the overlay is currently showing. */
export const CINEMA_OVERLAY_ITEM_ID_ATTRIBUTE = 'data-more-menu-item-id';

/** Prefix TikTok's player puts before the video id: id="xgwrapper-0-7683488557192727839". */
export const PLAYER_WRAPPER_ID_PREFIX = /^xgwrapper-\d+-/;
