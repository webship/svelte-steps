'use strict';

// The app's own navigation: a link followed and the browser's back, each to its end (a navigation
// inside the app, or a whole page load, told apart by the document, never by a request: a link the
// pointer rested on is fetched ahead and its click needs none), the route announcer, the link of the
// current page, and where the keyboard starts after a navigation.

const { When, Then } = require('@cucumber/cucumber');
const h = require('./svelte-helpers');

const withoutHash = (url) => String(url || '').split('#')[0];

async function linkByName(world, name) {
  const found = await h.byRoleAndName(world, 'link', name);
  if (!found.locator) {
    throw await h.laneFailure(world, `Expected a link named "${name}" on the page, but there is none.`, {
      found: `the links here: ${h.listed(found.names, 20)}`,
      hint: 'a link is named by its text, or its label; the name is matched from its start.',
    });
  }
  return found.locator;
}

/**
 * Follow a link of the app, by its name, and wait for the navigation to end: inside the app (a new
 * address, the route announcer holding the new page's title, the page at rest), or with a whole page
 * load (the new page loaded, and taken over by the app when it can be). The step first waits for the
 * app to take the page over, as a click before then loads a whole page.
 *
 * Example #1: When I follow the "Sverdle" link in the app
 * Example #2: When I follow the "About" link in the app
 * Example #3: And I follow the "How to play" link in the app
 * Example #4: When we follow the "Home" link in the app
 * Example #5: When I follow the "Invoices" link in the app
 */
When(/^(?:I |we )?follow the "([^"]*)" link in the app$/, async function (name) {
  await h.beforeActing(this);
  const link = await linkByName(this, name);
  const before = await h.pageState(this);
  const href = await link.evaluate((a) => a.href || '').catch(() => '');
  const sameAddress = !!href && withoutHash(href) === withoutHash(before && before.url);
  try {
    await link.click({ timeout: h.budget(this) });
  } catch (e) {
    throw h.friendly({ action: 'click', target: `the link "${name}"`, cause: e, hint: 'it may be covered by another part of the page, or not on the screen.' });
  }
  const nav = await h.followNavigation(this, before, sameAddress);
  if (nav.kind === 'none') {
    const s = nav.state || {};
    throw await h.laneFailure(this, `Following the link "${name}" did not end a navigation in ${Math.round(h.budget(this) / 1000)} s.`, {
      found: `the address is ${s.url || '(unknown)'}${href ? ` (the link goes to ${href})` : ''}; route announcer: "${s.announcer || ''}"; still busy: ${(s.busy || []).join('; ') || 'nothing'}`,
      hint: 'the app may have refused the navigation (a form with changes asking to stay), or the page it goes to failed to load.',
    });
  }
});

/**
 * Go back with the browser, and wait for the navigation to end, inside the app or with a whole page
 * load, as following a link does.
 *
 * Example #1: When I go back in the app
 * Example #2: And I go back in the app
 * Example #3: When we go back in the app
 * Example #4: Then I go back in the app
 * Example #5: Given I go back in the app
 */
When(/^(?:I |we )?go back in the app$/, async function () {
  await h.beforeActing(this);
  const before = await h.pageState(this);
  try {
    await this.page.goBack({ waitUntil: 'commit', timeout: h.budget(this) });
  } catch (e) {
    throw h.friendly({ action: 'go back', target: 'the previous page', cause: e, hint: 'the browser may have no page before this one in the scenario.' });
  }
  const nav = await h.followNavigation(this, before, false);
  if (nav.kind === 'none') {
    const s = nav.state || {};
    throw await h.laneFailure(this, 'Going back did not end a navigation.', {
      found: `the address is still ${s.url || before.url}`,
      hint: 'this may be the first page the scenario opened: there is no page before it.',
    });
  }
});

/**
 * Rest the pointer on a link of the app, as a person does before clicking it, and wait for what it
 * starts to end: an app can fetch the page the link goes to ahead of the click.
 *
 * Example #1: When I point at the "Sverdle" link
 * Example #2: When I point at the "About" link
 * Example #3: And I point at the "Home" link
 * Example #4: When we point at the "How to play" link
 * Example #5: When I point at the "Invoices" link
 */
When(/^(?:I |we )?point at the "([^"]*)" link$/, async function (name) {
  await h.beforeActing(this);
  const link = await linkByName(this, name);
  try {
    await link.hover({ timeout: h.budget(this) });
  } catch (e) {
    throw h.friendly({ action: 'point at', target: `the link "${name}"`, cause: e, hint: 'it may be covered by another part of the page.' });
  }
  await h.settle(this);
});

/**
 * How the last navigation of the pack's steps ended: inside the app (the same document: the page did
 * not load again, and what the page held in the browser stays), or with a whole page load.
 *
 * Example #1: Then the last navigation should have stayed in the app
 * Example #2: Then the last navigation should have loaded a whole page
 * Example #3: And the last navigation should have stayed in the app
 * Example #4: But the last navigation should have loaded a whole page
 * Example #5: Then the last navigation should have stayed in the app
 */
Then(/^the last navigation should have (stayed in the app|loaded a whole page)$/, async function (how) {
  const nav = this.svelteNavigation;
  const wanted = how === 'stayed in the app' ? 'app' : 'whole';
  if (!nav) {
    throw await h.laneFailure(this, 'Expected a navigation of the scenario, but none of its steps followed one.', {
      hint: 'navigate with "I follow the "..." link in the app" or "I go back in the app" first.',
    });
  }
  if (nav.kind === wanted) return;
  const said = { app: 'stayed in the app', whole: 'loaded a whole page', none: 'did not end' };
  throw await h.laneFailure(this, `Expected the last navigation to have ${how}, but it ${said[nav.kind] || nav.kind}.`, {
    found: `from ${nav.from} to ${nav.to}`,
    hint: wanted === 'app' ? 'a link to an address the app does not know, a page the app has not taken over, or a browser without JavaScript loads a whole page.' : 'a page the app has taken over navigates inside the app.',
  });
});

/**
 * The route announcer, the live region the app keeps for screen readers, says the title of the page
 * a navigation inside the app came to (matched exactly, then without regard to case, then from its
 * start). The step waits for it.
 *
 * Example #1: Then the navigation should be announced as "Sverdle"
 * Example #2: Then the navigation should be announced as "About"
 * Example #3: And the navigation should be announced as "How to play Sverdle"
 * Example #4: Then the navigation should be announced as "Home"
 * Example #5: Then the navigation should be announced as "Invoices"
 */
Then(/^the navigation should be announced as "([^"]*)"$/, async function (title) {
  const want = h.norm(title).toLowerCase();
  const result = await h.poll(this, (s) => {
    if (!s || s.announcer === null || s.announcer === undefined) return { done: false, state: s };
    const said = h.norm(s.announcer).toLowerCase();
    return { done: said === want || (want.length >= 3 && said.startsWith(want)), state: s };
  }, h.budget(this));
  if (result.done) return;
  const s = result.state || {};
  throw await h.laneFailure(this, s.announcer === null || s.announcer === undefined
    ? `Expected the navigation to be announced as "${title}", but the page has no route announcer.`
    : `Expected the navigation to be announced as "${title}", but the announcer says "${h.excerpt(s.announcer, 80)}".`, {
    found: `the page's title is "${s.title || ''}"`,
    hint: s.announcer === null || s.announcer === undefined ? 'the announcer is there once the app has taken the page over; a whole page load is not announced this way.' : 'the announcer says the title of the page after each navigation inside the app.',
  });
});

/**
 * A link marks the page a person is on (`aria-current="page"`, on the link or on the list item of the
 * navigation that holds it): the link of the current page in a navigation. The step waits for it.
 *
 * Example #1: Then the "Sverdle" link should mark the current page
 * Example #2: Then the "Home" link should mark the current page
 * Example #3: And the "About" link should mark the current page
 * Example #4: Then the "Invoices" link should mark the current page
 * Example #5: Then the "Settings" link should mark the current page
 */
Then(/^the "([^"]*)" link should mark the current page$/, async function (name) {
  const deadline = Date.now() + h.budget(this);
  let current = [];
  for (;;) {
    const link = (await h.byRoleAndName(this, 'link', name)).locator;
    const marked = link && await link.evaluate((a) => {
      const holder = a.closest('[aria-current]');
      return !!holder && holder.getAttribute('aria-current') === 'page' && (holder === a || (holder.tagName === 'LI' && holder.contains(a)));
    }).catch(() => false);
    if (marked) return;
    if (Date.now() + 50 >= deadline) break;
    await h.sleep(50);
  }
  current = await this.page.locator('[aria-current]').evaluateAll((els) => els.map((e) => `${(e.textContent || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()} (${e.getAttribute('aria-current')})`)).catch(() => []);
  throw await h.laneFailure(this, `Expected the link "${name}" to mark the current page, but it does not.`, {
    found: `the links that mark one: ${h.listed(current)}`,
    hint: 'the link of the current page carries aria-current="page", or the list item that holds it does.',
  });
});

/**
 * Where the keyboard starts after a navigation inside the app: on the page itself, so the next Tab
 * goes to the first thing of the new page, as after a page load. The route announcer's contract, with
 * the title it says.
 *
 * Example #1: Then I should be at the top of the page for the keyboard
 * Example #2: And I should be at the top of the page for the keyboard
 * Example #3: Then we should be at the top of the page for the keyboard
 * Example #4: But I should be at the top of the page for the keyboard
 * Example #5: Then I should be at the top of the page for the keyboard
 */
Then(/^(?:I|we) should be at the top of the page for the keyboard$/, async function () {
  const deadline = Date.now() + Math.min(h.budget(this), 5000);
  let last = null;
  for (;;) {
    try { last = await h.call(this, 'focusAtTop'); } catch (e) { last = null; }
    if (last && last.atTop) return;
    if (Date.now() + 50 >= deadline) break;
    await h.sleep(50);
  }
  throw await h.laneFailure(this, `Expected the keyboard to start at the top of the page, but the focus is on ${last ? last.focused : 'an element the page could not say'}.`, {
    hint: 'after a navigation inside the app the focus goes back to the page itself, unless an element of the new page asks for it (autofocus).',
  });
});
