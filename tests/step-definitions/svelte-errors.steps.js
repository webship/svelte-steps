'use strict';

// Error pages. An address the app does not know is a whole page load onto its error page; an error
// in a page's data can show it after a navigation inside the app. The step reads the status of the
// page (when it came by a page load) and its first heading, and the message when one is given.

const { Then } = require('@cucumber/cucumber');
const h = require('./svelte-helpers');

const withoutHash = (url) => String(url || '').split('#')[0];

/**
 * The page shows an error: its first heading carries the status (the app's error page shows it, as
 * the default one does), the page loaded with that status when it came by a page load, and the page
 * says the message, when one is given. The step waits for it.
 *
 * Example #1: Then the page should show the 404 error
 * Example #2: Then the page should show the 404 error "Not Found"
 * Example #3: And the page should show the 500 error "Internal Error"
 * Example #4: Then the page should show the 403 error
 * Example #5: Then the page should show the 404 error "Page not found"
 */
Then(/^the page should show the (\d{3}) error(?: "([^"]*)")?$/, async function (code, message) {
  const result = await h.poll(this, async (s) => {
    if (!s || s.readyState === 'loading') return { done: false };
    const heading = await h.call(this, 'firstHeading');
    const text = message ? await h.call(this, 'pageText') : '';
    const doc = this.svelteDocument;
    const nav = this.svelteNavigation;
    // The status is known when the page on the screen is the one the last page load brought.
    const known = !!doc && withoutHash(doc.url) === withoutHash(s.url) && !(nav && nav.kind === 'app' && nav.at > doc.at);
    const statusOk = !known || String(doc.status) === code;
    const headingOk = !!heading && heading.includes(code);
    const messageOk = !message || h.norm(text).toLowerCase().includes(h.norm(message).toLowerCase());
    return { done: statusOk && headingOk && messageOk, heading, known, status: known ? doc.status : null, messageOk, state: s };
  }, h.budget(this));
  if (result.done) return;
  const what = [];
  if (result.known && String(result.status) !== code) what.push(`the page loaded with the status ${result.status}`);
  if (!result.heading || !result.heading.includes(code)) what.push(result.heading ? `its first heading says "${h.excerpt(result.heading, 60)}"` : 'it has no first heading');
  if (message && !result.messageOk) what.push(`it does not say "${message}"`);
  throw await h.laneFailure(this, `Expected the page to show the ${code} error${message ? ` "${message}"` : ''}, but ${what.join(', and ') || 'it does not'}.`, {
    found: `${result.state ? result.state.url : 'the page'}${result.known ? '' : ' (reached inside the app: its status is not known, only the page)'}`,
    hint: 'an error page shows the status in its first heading and the message under it; a page of the app\'s own may word them differently.',
  });
});
