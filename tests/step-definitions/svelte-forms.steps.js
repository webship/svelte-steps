'use strict';

// Form actions, in both modes with one phrase. With JavaScript, an enhanced form sends its action as
// a request inside the page (`x-sveltekit-action: true`), then asks for the page's data again when
// the action succeeded; a refused action (a 4xx) changes nothing more, and the page may shake.
// Without JavaScript, or for a form the app does not enhance, the browser posts the form and loads
// the page it answers with. The step waits for whichever happens, and records it for the assertions.

const { When, Then } = require('@cucumber/cucumber');
const h = require('./svelte-helpers');

/**
 * Submit a form with one of its buttons, by the button's name, and wait for what it brings: the
 * action's answer inside the page and, when it succeeded, the page's data asked for again; or the
 * page a posted form loads (taken over by the app when it can be). A button the app handles in the
 * page without sending anything (a key of a game) ends when the page has come to rest.
 *
 * Example #1: When I submit the form with the "enter" button
 * Example #2: When I submit the form with the "restart" button
 * Example #3: And I submit the form with the "Save" button
 * Example #4: When we submit the form with the "Log in" button
 * Example #5: When I submit the form with the "a" button
 */
When(/^(?:I |we )?submit the form with the "([^"]*)" button$/, async function (name) {
  await h.beforeActing(this);
  const found = await h.byRoleAndName(this, 'button', name, this.page.locator('form'));
  if (!found.locator) {
    throw await h.laneFailure(this, `Expected a button named "${name}" in a form of the page, but there is none.`, {
      found: `the buttons of the page's forms: ${h.listed(found.names, 30)}`,
      hint: 'a button is named by its text, or its label; the name is matched from its start.',
    });
  }
  if (await found.locator.isDisabled().catch(() => false)) {
    throw await h.laneFailure(this, `Could not submit the form with the "${name}" button: it is disabled.`, {
      hint: 'the form may need something first (a field filled in, five letters of a guess).',
    });
  }
  const before = await h.pageState(this);
  const seq = await h.call(this, 'seq');
  const clicked = Date.now();
  try {
    await found.locator.click({ timeout: h.budget(this) });
  } catch (e) {
    throw h.friendly({ action: 'click', target: `the "${name}" button`, cause: e, hint: 'it may be covered by another part of the page.' });
  }
  const result = await h.poll(this, async (s) => {
    if (!s) return { done: false };
    if (s.doc !== before.doc) {
      const ready = s.readyState === 'complete' && (!s.start || !s.js || s.hydrated);
      return { done: ready && s.settled, mode: 'whole', state: s };
    }
    const fetches = await h.call(this, 'fetchesSince', seq);
    const action = fetches.find((f) => f.action);
    if (action) {
      if (!action.end) return { done: false, mode: 'app', state: s };
      if (action.status >= 200 && action.status < 300) {
        // A successful action asks for the page's data again (its invalidation), or the data of the
        // page it sends to: wait for that request, a second at most after the answer.
        const after = fetches.find((f) => f.seq > action.seq && f.data);
        if (!after && s.now - action.end < 1000) return { done: false, mode: 'app', state: s };
        if (after && !after.end) return { done: false, mode: 'app', state: s };
      }
      return { done: s.settled, mode: 'app', status: action.status, state: s };
    }
    // A page load on its way: the old page stays on the screen until the answer comes.
    if (this.svelteLoadStarted >= clicked) return { done: false, mode: 'whole', state: s };
    // Nothing sent and nothing loaded: the app handled the button in the page.
    return { done: s.settled && Date.now() - clicked > 300, mode: 'none', state: s };
  }, h.budget(this));
  if (!result.done) {
    const s = result.state || {};
    throw await h.laneFailure(this, `Submitting the form with the "${name}" button did not end in ${Math.round(h.budget(this) / 1000)} s.`, {
      found: `still busy: ${(s.busy || []).join('; ') || 'nothing'}`,
      hint: 'the server may not answer the form, or the page it sends to may fail to load.',
    });
  }
  let status = result.status;
  if (result.mode === 'whole') {
    const doc = this.svelteDocument;
    status = doc && doc.at >= clicked ? doc.status : undefined;
    this.svelteNavigation = { kind: 'whole', from: before.url, to: result.state.url, doc: result.state.doc, at: Date.now() };
  }
  this.svelteForm = { mode: result.mode, status, button: name, at: Date.now() };
});

/**
 * How the app answered the last form the pack's steps submitted: accepted it (an answer of 2xx or
 * 3xx), or refused it (4xx: the action failed what was sent).
 *
 * Example #1: Then the app should have accepted the form
 * Example #2: Then the app should have refused the form
 * Example #3: And the app should have accepted the form
 * Example #4: But the app should have refused the form
 * Example #5: Then the app should have accepted the form
 */
Then(/^the app should have (accepted|refused) the form$/, async function (how) {
  const form = this.svelteForm;
  if (!form) {
    throw await h.laneFailure(this, 'Expected a form the scenario submitted, but none of its steps submitted one.', {
      hint: 'submit it with "I submit the form with the "..." button" first.',
    });
  }
  if (form.mode === 'none' || form.status === undefined || form.status === null) {
    throw await h.laneFailure(this, `Expected the app to have ${how} the form, but the "${form.button}" button sent nothing.`, {
      found: 'the app handled the button in the page: no request, no page load',
      hint: 'a button can change the page without sending the form (a key of a game); the form is sent by its submit button.',
    });
  }
  const accepted = form.status >= 200 && form.status < 400;
  const refused = form.status >= 400 && form.status < 500;
  if ((how === 'accepted' && accepted) || (how === 'refused' && refused)) return;
  throw await h.laneFailure(this, `Expected the app to have ${how} the form, but it answered ${form.status}.`, {
    found: form.mode === 'app' ? 'the answer of the form\'s action, inside the page' : 'the status of the page the posted form loaded',
    hint: how === 'accepted'
      ? (form.status === 403
        ? 'the app refuses a form posted without the page\'s Origin header (its check against cross-site posts): a browser started with --disable-web-security sends none. Remove that flag from playwright.config.ts.'
        : 'a refused form keeps what was sent and says why: look at the messages of the page.')
      : 'an accepted form answers with 200, or sends to another page.',
  });
});

/**
 * How the last form the pack's steps submitted was sent: inside the page (an enhanced form, with
 * JavaScript), or with a page load (without JavaScript, or a form the app does not enhance).
 *
 * Example #1: Then the form should have been sent without loading the page
 * Example #2: Then the form should have been sent with a page load
 * Example #3: And the form should have been sent without loading the page
 * Example #4: But the form should have been sent with a page load
 * Example #5: Then the form should have been sent without loading the page
 */
Then(/^the form should have been sent (without loading the page|with a page load)$/, async function (how) {
  const form = this.svelteForm;
  if (!form) {
    throw await h.laneFailure(this, 'Expected a form the scenario submitted, but none of its steps submitted one.', {
      hint: 'submit it with "I submit the form with the "..." button" first.',
    });
  }
  const wanted = how === 'without loading the page' ? 'app' : 'whole';
  if (form.mode === wanted) return;
  const said = { app: 'inside the page', whole: 'with a page load', none: 'not at all: the app handled the button in the page' };
  throw await h.laneFailure(this, `Expected the form to have been sent ${how}, but it was sent ${said[form.mode] || form.mode}.`, {
    found: `the "${form.button}" button`,
    hint: wanted === 'app' ? 'a form is sent inside the page when the app has taken the page over and enhances the form.' : 'without JavaScript a form loads the page it is answered with.',
  });
});
