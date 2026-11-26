'use strict';

// The page side of the pack: put into every page before the page's own scripts (svelte-helpers.js
// does it), it installs `window.__webshipSvelte`.
//
// It keeps to the page side, never to the app's DOM: an id for each document (so a step tells a
// navigation inside the app from a whole page load without counting on requests), the frames the
// page asks for (requestAnimationFrame: the springs and tweens of a motion show no animation, only
// frames), the fetches it has in flight (an action of a form, the data of a route, its invalidation),
// the input events, the changes of the DOM, and the texts of the route announcer (the live region
// the app renders for screen readers once it has taken the page over).
//
// Not a step file: it registers no step definitions. `appProbe` is a plain function, serialised into
// the page.

function appProbe() {
  if (window.__webshipSvelte) return;
  const now = () => performance.now();
  const nativeRaf = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);
  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  const state = {
    doc: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    frames: 0,
    pending: new Set(),
    lastFrame: 0,
    lastInput: 0,
    lastMutation: 0,
    inFlight: 0,
    seq: 0,
    fetches: [],
    announcements: [],
  };

  // Frames: every callback the page asks for, until it runs or is cancelled. The probe's own
  // waits use the original function, so they are not counted.
  window.requestAnimationFrame = function requestAnimationFrame(callback) {
    let id = 0;
    id = nativeRaf((time) => {
      state.pending.delete(id);
      state.frames += 1;
      state.lastFrame = now();
      return callback(time);
    });
    state.pending.add(id);
    return id;
  };
  window.cancelAnimationFrame = function cancelAnimationFrame(id) {
    state.pending.delete(id);
    return nativeCancel(id);
  };

  // Fetches the page starts: an action of a form carries `x-sveltekit-action: true`, the data of a
  // route after an action carries `x-sveltekit-invalidated` in its address.
  if (nativeFetch) {
    window.fetch = function fetch(input, init) {
      let url = '';
      let method = 'GET';
      let action = false;
      try {
        url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, location.href).href;
        method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        const headers = new Headers((init && init.headers) || (input && typeof input !== 'string' && !(input instanceof URL) && input.headers) || {});
        action = headers.get('x-sveltekit-action') === 'true';
      } catch (e) { /* an address the page itself will refuse */ }
      const entry = {
        seq: (state.seq += 1),
        url,
        method,
        action,
        data: /\/__data\.json(\?|$)/.test(url),
        invalidated: /[?&]x-sveltekit-invalidated=/.test(url),
        status: 0,
        start: now(),
        end: 0,
      };
      state.fetches.push(entry);
      if (state.fetches.length > 200) state.fetches.shift();
      state.inFlight += 1;
      const done = (status) => {
        if (entry.end) return;
        entry.status = status;
        entry.end = now();
        state.inFlight -= 1;
      };
      return nativeFetch(input, init).then((response) => { done(response.status); return response; }, (error) => { done(-1); throw error; });
    };
  }

  const markInput = () => { state.lastInput = now(); };
  for (const type of ['pointerdown', 'mousedown', 'keydown', 'click', 'submit', 'input']) {
    window.addEventListener(type, markInput, true);
  }

  // Changes of the DOM, and the texts the route announcer is given.
  const announcerText = () => {
    const el = document.getElementById('svelte-announcer');
    return el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : null;
  };
  let lastAnnounced = null;
  new MutationObserver(() => {
    state.lastMutation = now();
    const text = announcerText();
    if (text !== null && text !== lastAnnounced) {
      lastAnnounced = text;
      if (text) state.announcements.push({ text, at: now() });
    }
  }).observe(document, { childList: true, subtree: true, attributes: true, characterData: true });

  function hasStart() {
    for (const s of document.querySelectorAll('script:not([src])')) {
      if (/\bkit\.start\(/.test(s.textContent || '')) return true;
    }
    return !!document.querySelector('script[src*="/entry/start"], link[href*="/entry/start"]');
  }

  function runningAnimations() {
    if (!document.getAnimations) return [];
    return document.getAnimations().filter((a) => {
      if (a.playState !== 'running') return false;
      try {
        const end = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming().endTime : 0;
        return Number.isFinite(end);
      } catch (e) {
        return false;
      }
    }).map((a) => a.animationName || a.transitionProperty || (a.effect && a.effect.target && a.effect.target.tagName ? `an animation of a ${a.effect.target.tagName.toLowerCase()}` : 'an animation'));
  }

  // Does this page run its own scripts? A browser without JavaScript (a lane of the suite) never lets
  // the app take the page over, and the steps do not wait for it there. Asked once per document.
  let scriptsRun = null;
  function jsOn() {
    if (scriptsRun !== null) return scriptsRun;
    try {
      const s = document.createElement('script');
      s.textContent = 'window.__webshipSvelteScripts = 1;';
      (document.head || document.documentElement).appendChild(s);
      s.remove();
      scriptsRun = window.__webshipSvelteScripts === 1;
    } catch (e) {
      scriptsRun = false;
    }
    return scriptsRun;
  }

  const lib = {
    doc: () => state.doc,
    jsOn,
    hasStart,
    announcerText,
    announcements: () => state.announcements.map((a) => a.text),
    announceCount: () => state.announcements.length,
    seq: () => state.seq,
    fetchesSince: (seq) => state.fetches.filter((f) => f.seq > seq).map((f) => ({ ...f })),
    // The page's state for a wait. Settled: the document loaded, no fetch in flight, no frame asked
    // for, no finite animation running, the app has taken the page over when it can, and 40 ms of
    // quiet (no frame, no change of the DOM), with a frame after the last input or 100 ms of nothing.
    state() {
      const t = now();
      const animations = runningAnimations();
      const start = hasStart();
      const js = jsOn();
      const hydrated = !!document.getElementById('svelte-announcer');
      const sinceFrame = state.lastFrame ? t - state.lastFrame : t;
      const sinceMutation = state.lastMutation ? t - state.lastMutation : t;
      const sinceInput = state.lastInput ? t - state.lastInput : t;
      const frameAfterInput = state.lastFrame > state.lastInput;
      const busy = [];
      if (document.readyState !== 'complete') busy.push(`the document is ${document.readyState}`);
      if (state.inFlight) busy.push(`${state.inFlight} request${state.inFlight > 1 ? 's' : ''} in flight`);
      if (state.pending.size) busy.push(`${state.pending.size} frame${state.pending.size > 1 ? 's' : ''} asked for`);
      if (animations.length) busy.push(`running: ${animations.slice(0, 3).join(', ')}`);
      if (start && js && !hydrated) busy.push('the app has not taken the page over yet');
      if (sinceMutation < 40) busy.push('the page changed in the last 40 ms');
      if (sinceFrame < 40) busy.push('a frame ran in the last 40 ms');
      if (!frameAfterInput && sinceInput < 100) busy.push('no frame since the last input');
      return {
        now: t,
        doc: state.doc,
        url: location.href,
        title: document.title,
        readyState: document.readyState,
        start,
        js,
        hydrated,
        inFlight: state.inFlight,
        frames: state.frames,
        animations,
        announcer: announcerText(),
        announced: state.announcements.length,
        busy,
        settled: busy.length === 0,
      };
    },
    focusAtTop() {
      const el = document.activeElement;
      return { atTop: !el || el === document.body || el === document.documentElement, focused: el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.getAttribute('aria-label') ? ` "${el.getAttribute('aria-label')}"` : (el.textContent && el.textContent.trim() ? ` "${el.textContent.trim().slice(0, 40)}"` : '')}` : '(none)' };
    },
    firstHeading() {
      const h = document.querySelector('h1');
      return h ? String(h.textContent || '').replace(/\s+/g, ' ').trim() : null;
    },
    pageText() {
      return String((document.body && document.body.innerText) || '').replace(/\s+/g, ' ').trim();
    },
  };

  window.__webshipSvelte = { lib };
}

module.exports = { appProbe };
