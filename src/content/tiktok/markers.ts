import { SELECTORS } from './selectors';

/** Where to look for TikTok's labels, and which subtrees never count (captions, hashtags...). */
export interface MarkerScope {
  readonly root: ParentNode;
  readonly ignore: string;
}

const LIVE_LABEL = /^(live|en vivo|en directo|ao vivo)$/i;
const AD_LABEL =
  /^(patrocinado|sponsored|publicidad|anuncio|promocionado|promoted|ad|contenido patrocinado)$/i;
const LIVE_E2E = /(^|-)live(-|$)/i;
const AD_E2E = /(^|-)ad(-|$)|sponsor|promot/i;
const LIVE_PATH = /^\/(@[^/]+\/)?live(\/|$)/i;
const LABEL_TAGS = 'span, div, p, strong, a';
const MAX_LABEL_LENGTH = 24;

export function hasAdMarker(scope: MarkerScope): boolean {
  return e2eValues(scope).some((value) => AD_E2E.test(value)) || hasLabel(scope, AD_LABEL);
}

export function hasLiveMarker(scope: MarkerScope): boolean {
  return (
    linksToLive(scope) ||
    e2eValues(scope).some((value) => LIVE_E2E.test(value)) ||
    hasLabel(scope, LIVE_LABEL)
  );
}

function elements<E extends Element>(scope: MarkerScope, selector: string): E[] {
  return [...scope.root.querySelectorAll<E>(selector)].filter(
    (el) => el.closest(scope.ignore) === null,
  );
}

function e2eValues(scope: MarkerScope): string[] {
  return elements(scope, '[data-e2e]').map((el) => el.getAttribute('data-e2e') ?? '');
}

/** Short leaf texts such as "LIVE" or "Publicidad". Author names are skipped: anyone can be called "Live". */
function hasLabel(scope: MarkerScope, pattern: RegExp): boolean {
  return elements(scope, LABEL_TAGS).some((el) => {
    if (el.childElementCount > 0 || el.closest(SELECTORS.authorLink) !== null) return false;
    const text = el.textContent.trim();
    return text.length <= MAX_LABEL_LENGTH && pattern.test(text);
  });
}

function linksToLive(scope: MarkerScope): boolean {
  return elements<HTMLAnchorElement>(scope, 'a[href*="live"]').some((link) => {
    try {
      return LIVE_PATH.test(new URL(link.href).pathname);
    } catch {
      return false;
    }
  });
}
