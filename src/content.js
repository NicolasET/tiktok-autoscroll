/* Autoscroll for TikTok — content script
 * Advances the For You / Following feed when the active video ends.
 * Works without chrome.* APIs too (in-memory config) so the logic can be
 * smoke-tested by pasting it into the DevTools console.
 */
(() => {
  if (window.__tasLoaded) return;
  window.__tasLoaded = true;

  const DEFAULTS = {
    enabled: false,
    skipLive: true,
    skipAds: true,
    pauseOnInteract: true,
    showFloating: true,
    photoSeconds: 12,
    watchedCount: 0
  };

  const SEL = {
    section: '[data-e2e="feed-video"]',
    next: '[data-e2e="feed-navigation-next"]',
    comments: [
      '[data-e2e="comment-level-1"]',
      '[data-e2e="comment-list"]',
      '[data-e2e="search-comment-container"]',
      '[data-e2e="comment-input"]',
      '[class*="DivCommentListContainer"]',
      '[class*="DivCommentContainer"]'
    ].join(','),
    descText: '[data-e2e="video-desc"], [data-e2e^="desc-span"], [data-e2e="multiline-text-content"]'
  };

  const LIVE_TEXT = /^(live|en vivo|en directo|ao vivo)$/i;
  const AD_TEXT = /^(patrocinado|sponsored|publicidad|anuncio|promocionado|promoted|ad|contenido patrocinado)$/i;
  const AD_E2E = /(^|-)ad(-|$)|sponsor|promot/i;

  const POLL_MS = 400;
  const COOLDOWN_MS = 1500;
  const INTERACT_WINDOW_MS = 2500;
  const COUNT_AFTER_MS = 3000;
  const SKIP_DELAY_MS = 700;

  // ---------- config / storage ----------
  const hasChrome = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  let cfg = { ...DEFAULTS };

  async function loadCfg() {
    if (hasChrome) cfg = { ...DEFAULTS, ...(await chrome.storage.local.get(null)) };
    render();
  }

  function setCfg(patch) {
    Object.assign(cfg, patch);
    if (hasChrome) chrome.storage.local.set(patch);
    render();
  }

  if (hasChrome) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      for (const k in changes) cfg[k] = changes[k].newValue;
      if (changes.enabled && !changes.enabled.newValue) pending = null;
      render();
    });
  }

  // ---------- state ----------
  let lastMoveAt = 0;
  let cooldownUntil = 0;
  let pending = null;          // { sec } — advance deferred because user is interacting
  let activeKey = null;
  let activeSince = 0;
  let activeSec = null;
  let skipScheduledFor = null;
  const counted = new Set();
  const lastTimes = new WeakMap(); // video -> last currentTime (loop fallback)

  // ---------- DOM helpers ----------
  const sections = () => [...document.querySelectorAll(SEL.section)];

  function isFeed() {
    return !!document.querySelector(SEL.section);
  }

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  }

  function getActiveSection() {
    const playing = [...document.querySelectorAll(`${SEL.section} video`)]
      .find(v => !v.paused && !v.ended && v.readyState > 1);
    if (playing) return playing.closest(SEL.section);

    // Fallback: section closest to the viewport center
    const mid = innerHeight / 2;
    let best = null, bestD = Infinity;
    for (const s of sections()) {
      const r = s.getBoundingClientRect();
      if (r.height < 50) continue;
      const d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best && bestD < innerHeight / 2 ? best : null;
  }

  function sectionKey(sec) {
    const wrap = sec.querySelector('[id^="xgwrapper-"]');
    if (wrap) return wrap.id.replace(/^xgwrapper-\d+-/, '');
    const desc = sec.querySelector(SEL.descText);
    return `${sec.id}:${(desc ? desc.textContent : sec.textContent).slice(0, 80)}`;
  }

  function leafTexts(sec) {
    const out = [];
    for (const el of sec.querySelectorAll('span, div, p, strong, a')) {
      if (el.childElementCount) continue;
      if (el.closest(SEL.descText)) continue; // ignore captions/hashtags
      const t = el.textContent.trim();
      if (t && t.length <= 24) out.push(t);
    }
    return out;
  }

  function isLive(sec) {
    const liveLink = [...sec.querySelectorAll('a[href*="live"]')].some(a => {
      if (a.closest(SEL.descText)) return false; // hashtags like #livestream
      try { return /^\/(@[^/]+\/)?live(\/|$)/i.test(new URL(a.href, location.href).pathname); }
      catch { return false; }
    });
    if (liveLink) return true;
    if ([...sec.querySelectorAll('[data-e2e]')].some(e => /(^|-)live(-|$)/i.test(e.dataset.e2e))) return true;
    return leafTexts(sec).some(t => LIVE_TEXT.test(t));
  }

  function isAd(sec) {
    if ([...sec.querySelectorAll('[data-e2e]')].some(e => AD_E2E.test(e.dataset.e2e))) return true;
    return leafTexts(sec).some(t => AD_TEXT.test(t));
  }

  function commentsOpen() {
    return [...document.querySelectorAll(SEL.comments)].some(isVisible);
  }

  function typing() {
    const a = document.activeElement;
    return !!a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
  }

  function isInteracting() {
    if (!cfg.pauseOnInteract) return false;
    return Date.now() - lastMoveAt < INTERACT_WINDOW_MS || commentsOpen() || typing();
  }

  // ---------- advancing ----------
  function doAdvance(reason) {
    cooldownUntil = Date.now() + COOLDOWN_MS;
    pending = null;

    const btn = document.querySelector(SEL.next);
    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
      btn.click();
      log('advance via next button', reason);
      return;
    }
    const cur = getActiveSection();
    const list = sections();
    const nxt = list[list.indexOf(cur) + 1];
    if (nxt) {
      nxt.scrollIntoView({ behavior: 'smooth', block: 'start' });
      log('advance via scrollIntoView', reason);
      return;
    }
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40, bubbles: true
    }));
    log('advance via ArrowDown', reason);
  }

  function requestAdvance(sec, reason) {
    if (!cfg.enabled || !isFeed()) return;

    // Skips target a freshly-activated item, so they bypass the cooldown left
    // by the advance that brought us here (otherwise ads right after an
    // advance would never be skipped).
    if (reason === 'skip') {
      if (getActiveSection() === sec) doAdvance(reason);
      return;
    }
    if (Date.now() < cooldownUntil) return;

    if (isInteracting()) {
      pending = { sec };
      render();
      return;
    }
    // Small grace period: if TikTok (or the user) already moved on, do nothing.
    setTimeout(() => {
      if (!cfg.enabled || Date.now() < cooldownUntil) return;
      const now = getActiveSection();
      if (now && now !== sec) return;
      doAdvance(reason);
    }, 300);
  }

  // ---------- events ----------
  document.addEventListener('ended', (e) => {
    const v = e.target;
    if (!(v instanceof HTMLVideoElement)) return;
    const sec = v.closest(SEL.section);
    if (sec) requestAdvance(sec, 'ended');
  }, true);

  // Fallback for videos that loop natively (no "ended" event): detect wrap-around.
  document.addEventListener('timeupdate', (e) => {
    const v = e.target;
    if (!(v instanceof HTMLVideoElement)) return;
    const prev = lastTimes.get(v) ?? 0;
    lastTimes.set(v, v.currentTime);
    if (v.loop && v.duration && prev > v.duration - 1 && v.currentTime < 1) {
      const sec = v.closest(SEL.section);
      if (sec) requestAdvance(sec, 'loop');
    }
  }, true);

  document.addEventListener('mousemove', (e) => {
    if (e.target instanceof Element && e.target.closest(SEL.section)) lastMoveAt = Date.now();
  }, { passive: true, capture: true });

  // ---------- main loop ----------
  function tick() {
    if (!isFeed()) { render(); return; }

    const sec = getActiveSection();
    if (!sec) return;
    const key = sectionKey(sec);

    if (key !== activeKey) {
      activeKey = key;
      activeSec = sec;
      activeSince = Date.now();
      pending = null;
      skipScheduledFor = null;
    }

    // Skip LIVE / ads as soon as they become active
    if (cfg.enabled && skipScheduledFor !== key) {
      const live = cfg.skipLive && isLive(sec);
      const ad = !live && cfg.skipAds && isAd(sec);
      if (live || ad) {
        skipScheduledFor = key;
        setTimeout(() => {
          if (activeKey === key) requestAdvance(sec, 'skip');
        }, SKIP_DELAY_MS);
        // Retry if we're still stuck on the same LIVE/ad a moment later
        setTimeout(() => {
          if (activeKey === key) skipScheduledFor = null;
        }, SKIP_DELAY_MS + 2500);
        log(`skipping ${live ? 'LIVE' : 'ad'}`, key);
        return;
      }
    }

    // Count as watched after a few seconds on screen (skipped items never count)
    if (skipScheduledFor !== key && !counted.has(key) && Date.now() - activeSince > COUNT_AFTER_MS) {
      counted.add(key);
      setCfg({ watchedCount: (cfg.watchedCount || 0) + 1 });
    }

    // Deferred advance once the user stops interacting
    if (pending && cfg.enabled && !isInteracting()) {
      if (pending.sec === sec) doAdvance('deferred');
      else pending = null;
    }

    // Photo / carousel posts: no <video>, so advance on a timer
    if (cfg.enabled && cfg.photoSeconds > 0 && !sec.querySelector('video')
        && Date.now() - activeSince > cfg.photoSeconds * 1000) {
      requestAdvance(sec, 'photo');
    }

    render();
  }

  // ---------- floating button ----------
  let fab = null;

  function ensureFab() {
    if (fab && document.body.contains(fab)) return fab;
    fab = document.createElement('button');
    fab.id = 'tas-fab';
    fab.type = 'button';
    fab.title = 'Autoscroll for TikTok (Alt+Shift+S)';
    fab.setAttribute('aria-label', 'Autoscroll');
    fab.innerHTML = '<span class="tas-dot"></span><span class="tas-label"></span><span class="tas-count"></span>';
    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      setCfg({ enabled: !cfg.enabled });
    });
    document.body.appendChild(fab);
    return fab;
  }

  function render() {
    if (!document.body) return;
    const show = cfg.showFloating && isFeed();
    if (!show) { if (fab) fab.style.display = 'none'; return; }
    const b = ensureFab();
    b.style.display = '';
    b.classList.toggle('tas-on', !!cfg.enabled);
    b.setAttribute('aria-pressed', String(!!cfg.enabled));
    b.classList.toggle('tas-wait', !!(cfg.enabled && pending));
    b.querySelector('.tas-label').textContent =
      !cfg.enabled ? 'Auto off' : pending ? 'En espera' : 'Auto on';
    b.querySelector('.tas-count').textContent = String(cfg.watchedCount || 0);
  }

  function log(...args) {
    if (window.__tasDebug) console.log('[Autoscroll for TikTok]', ...args);
  }

  // Debug handle for the console
  window.__tas = {
    get cfg() { return cfg; },
    set: setCfg,
    advance: () => doAdvance('manual'),
    state: () => ({ activeKey, pending: !!pending, interacting: isInteracting(), commentsOpen: commentsOpen(),
                    live: activeSec && isLive(activeSec), ad: activeSec && isAd(activeSec) })
  };

  loadCfg();
  setInterval(tick, POLL_MS);
})();
