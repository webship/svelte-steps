'use strict';

// The app and its waits: the app taking the server's page over, a page without client-side code, the
// page coming to rest. The waits of every other step of the pack build on these.

const { Given, When, Then, AfterStep } = require('@cucumber/cucumber');
const h = require('./svelte-helpers');

/**
 * Wait for the app to take the page over. A page arrives as the server's HTML, and the app's start
 * script then makes it the app's in the browser: until then its links load whole pages and its
 * buttons do nothing yet. The sign is the route announcer the app renders for screen readers once it
 * has taken the page over. A page without client-side code, or a browser without JavaScript, has
 * nothing to wait for: the step goes on, and the run's log says so.
 *
 * Example #1: Given the app has taken over the page
 * Example #2: When the app has taken over the page
 * Example #3: And the app has taken over the page
 * Example #4: Then the app has taken over the page
 * Example #5: But the app has taken over the page
 */
Given(/^the app has taken over the page$/, async function () {
  const t = await h.beforeActing(this);
  if (t.start && t.js && !t.taken) {
    throw await h.laneFailure(this, 'Expected the app to take the page over, but it did not.', {
      found: `the page loads the app's start script, and no route announcer appeared in ${Math.round(h.budget(this) / 1000)} s`,
      hint: 'the app may have failed to start: look at the browser errors of the run (a module that did not load, an error in a load function).',
    });
  }
  await h.settle(this);
});

/**
 * The app has taken the page over: the page loads the app's start script and the route announcer is
 * there. Unlike "the app has taken over the page", it fails on a page without client-side code and in a
 * browser without JavaScript.
 *
 * Example #1: Then the app should have taken over the page
 * Example #2: And the app should have taken over the page
 * Example #3: Then the app should have taken over the page
 * Example #4: But the app should have taken over the page
 * Example #5: Then the app should have taken over the page
 */
Then(/^the app should have taken over the page$/, async function () {
  const t = await h.takenOver(this);
  if (t.taken) return;
  const s = t.state || {};
  throw await h.laneFailure(this, !t.start
    ? 'Expected the app to have taken over the page, but the page has no client-side code.'
    : (!t.js ? 'Expected the app to have taken over the page, but the browser has JavaScript off.' : 'Expected the app to have taken over the page, but it has not.'), {
    found: `${s.url || 'the page'}: ${t.start ? 'it loads the app\'s start script' : 'it does not load the app\'s start script'}; route announcer: ${s.announcer === null || s.announcer === undefined ? 'none' : 'there'}`,
    hint: !t.start ? 'a page of the app can be built without client-side code (a prerendered page): "the page should have no client-side code" says so.' : 'look at the browser errors of the run: a module that did not load, or an error while the app starts.',
  });
});

/**
 * The page has no client-side code: it does not load the app's start script, so the app never takes
 * it over when it is loaded directly (a page prerendered without it). Its links load whole pages.
 *
 * Example #1: Then the page should have no client-side code
 * Example #2: And the page should have no client-side code
 * Example #3: Then the page should have no client-side code
 * Example #4: But the page should have no client-side code
 * Example #5: Then the page should have no client-side code
 */
Then(/^the page should have no client-side code$/, async function () {
  const result = await h.poll(this, (s) => ({ done: !!s && s.readyState !== 'loading' && !s.start, state: s }), h.budget(this));
  if (result.done) return;
  const s = result.state || {};
  throw await h.laneFailure(this, 'Expected the page to have no client-side code, but it loads the app\'s start script.', {
    found: `${s.url || 'the page'}; route announcer: ${s.announcer === null || s.announcer === undefined ? 'none' : 'there'}`,
    hint: 'a page built with client-side code turned off has no start script.',
  });
});

/**
 * Wait for the page to come to rest: no page load in progress, no request in flight, no frame asked
 * for (the springs and tweens of a motion move by frames), no animation or transition running, the
 * app has taken the page over when it can, and nothing has changed for two frames.
 *
 * Example #1: When I wait for the app to come to rest
 * Example #2: And I wait for the app to come to rest
 * Example #3: When we wait for the app to come to rest
 * Example #4: Then I wait for the app to come to rest
 * Example #5: Given I wait for the app to come to rest
 */
When(/^(?:I |we )?wait for the app to come to rest$/, async function () {
  const result = await h.settle(this, h.budget(this));
  if (result.done) return;
  const s = result.state || {};
  throw await h.laneFailure(this, `Expected the app to come to rest, but it was still busy after ${Math.round(h.budget(this) / 1000)} s.`, {
    found: (s.busy || []).join('; ') || 'the page was between two documents',
    hint: 'an animation without an end, or a request that never answers, keeps a page busy: wait for what a person waits for instead (a text, a field).',
  });
});

// Opt in with the tag @settle-after-steps: after every step of the scenario (webship-js's own
// `I press "…"`, `I click "…"` too), wait for the app to come to rest, on a page that loads the app's
// start script. It never fails a step: what comes next waits for what it expects anyway.
AfterStep({ tags: '@settle-after-steps' }, async function () {
  if (!this.page) return;
  const s = await h.pageState(this);
  if (s && s.start) await h.settle(this);
});
