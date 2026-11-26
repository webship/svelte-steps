<p align="center"><img src="https://raw.githubusercontent.com/webship/svelte-steps/2.0.x/assets/logo.svg" alt="Svelte logo" width="96"></p>

# svelte-steps

Cucumber step definitions for Svelte apps, SvelteKit first, for [webship-js](https://webship.co/docs/webship-js/2.0.x),
a BDD browser automation harness built on Playwright and Cucumber-js.

A SvelteKit page arrives as the server's HTML; the app's start script then takes it over in the browser. Until it has,
the page's links load whole pages and its buttons do nothing yet. After it has, the app moves between pages inside the
page, fetches each page's data, sends a form's action as a request and asks for the data again, and moves things with
frames and animations. The steps wait for each of those to end, on the page's own signals, never for a fixed time:

- the route announcer the app renders for screen readers once it has taken the page over, and the title it says after
  each navigation inside the app;
- the document: a navigation inside the app keeps it, a whole page load brings a new one (told apart without counting
  on a request: a link the pointer rested on is fetched ahead, and its click sends none);
- the requests in flight (an action of a form, the data of a page, its invalidation), the frames asked for (the springs
  and tweens of a motion show no animation, only frames) and the animations and transitions running.

The same steps run in a browser with JavaScript and in one without, as SvelteKit's own suite does: a form's step waits
for the action's answer inside the page in the one, and for the page the posted form loads in the other.

No step phrase names the framework: a scenario reads `When I follow the "Sverdle" link in the app`, `When I submit the
form with the "enter" button` and `Then the app should have refused the form`.

CI makes the demo of the official create flow, builds it with the Node adapter, serves it, and runs the whole suite
against it twice in a browser with JavaScript and twice in one without, then the assertions that must fail in each; see
[`.github/workflows/test.yml`](.github/workflows/test.yml).

## Taking the page over

A page that loads the app's start script is waited on until the app has taken it over: its route announcer (a live
region for screen readers, rendered once the app has mounted) is the sign. Two kinds of page have nothing to wait for,
and the steps go on, saying so in the run's log:

- a page built without client-side code (a page prerendered with `csr = false`): it does not load the start script,
  so nothing takes it over when it is loaded directly, and its links load whole pages;
- every page in a browser without JavaScript.

`Given the app has taken over the page` waits for it on purpose; every step that acts (following a link, pointing at
one, submitting a form) waits for it first, as a click before then loads a whole page.

## From nothing to a green run

What the machine needs: git, Node.js 24 or later with npm, and Docker to make and serve the demo (or a SvelteKit app
that is built and served already).

**1. An app.** Any SvelteKit app works (step 5 points the suite at it). To start, make the demo of the official create
flow with this repository's script: it runs `sv create --template demo` and `npm run build` in a Node.js container,
with the Node adapter, and serves the build with the adapter's own server:

```bash
git clone https://github.com/webship/svelte-steps.git
cd svelte-steps
npm run demo:build
npm run demo:serve
```

The demo answers at `http://127.0.0.1:3000`: a home page with a counter, an about page, and a word game made of form
actions. Leave the server running in its own terminal. It has no accounts: the steps need none.

**2. A test project**, in another folder:

```bash
mkdir svelte-tests && cd svelte-tests
npm init -y
npm install --save-dev webship-js @webship-js/svelte-steps
npx init-webship-js
```

`npx init-webship-js` writes `cucumber.js`, `playwright.config.ts`, the `tests/` folders with a first feature and
the `npm test` scripts, and installs Chromium. Its `playwright.config.ts` starts Chromium without
`--disable-web-security`, which made the app refuse every enhanced form with 403: fixed in webship-js 2.0.18.

**3. `cucumber.js`.** Replace the file with the wiring of the pack: the step files of webship-js and of the pack, the
tags that keep the lanes of this repository out of a normal run, and the address of the app.

```javascript
module.exports = {
  default: {
    requireModule: ['tsx/cjs'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',
      'node_modules/@webship-js/svelte-steps/tests/step-definitions/*.js',
      'tests/step-definitions/**/*.js',
    ],
    paths: ['tests/features/**/*.feature'],
    // Work in progress, the assertions that must fail and the scenarios of a browser without JavaScript stay out.
    tags: 'not @wip and not @must-fail and not @no-javascript',
    format: ['@cucumber/pretty-formatter', 'json:tests/reports/cucumber_report.json'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'http://127.0.0.1:3000',
      // Browser errors are reported, not failed: a refused form shows one ("Failed to load resource: 400").
      javascript: { mode: 'warn', levels: ['error'] },
      // The waits webship-js adds around each page, scenario and step (milliseconds).
      minWaitTime: { page: 3000, before_scenario: 0, after_scenario: 0, before_step: 0, after_step: 0 },
    },
  },
};
```

**4. A first feature**, `tests/features/first-run.feature`:

```gherkin
Feature: First run
  Scenario: A link stays in the app and is announced
    Given I am on "/"
    When I follow the "Sverdle" link in the app
    Then the last navigation should have stayed in the app
    And the navigation should be announced as "Sverdle"

  Scenario: A word the game does not know is refused
    Given I am on "/sverdle"
    When I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "enter" button
    Then the app should have refused the form
```

**5. Run it.** Set `LAUNCH_URL` to the address of the app:

```bash
LAUNCH_URL=http://127.0.0.1:3000 npm test
```

A green first run prints every step, the browser error of the refused word (reported, not failed: `mode: 'warn'`),
then the summary (the starter feature of `npx init-webship-js` and the two scenarios above, passed) and the HTML report
it wrote:

```
[webship-js] JavaScript errors during "A word the game does not know is refused" (mode=warn):
  1. [console.error] Failed to load resource: the server responded with a status of 400 (Bad Request)

3 scenarios (3 passed)
14 steps (14 passed)
0m04.891s (executing steps: 0m04.857s)
[webship-js] HTML report → …/svelte-tests/tests/reports/cucumber_report.html
```

From there, copy the features of [`tests/features/`](tests/features/) (they also ship in the package, under
`node_modules/@webship-js/svelte-steps/tests/features/`): together they use every step of the pack, against the demo.

### On an app of your own

Point `LAUNCH_URL` at the address the app is served at, and write the features from what its pages show: links and
buttons by the names a person reads, forms by their buttons, pages by their titles.

- **A browser without JavaScript:** set `javaScriptEnabled: false` in `contextOptions` of `playwright.config.ts`
  (this repository does it from `JAVASCRIPT=off`) and run the scenarios that hold without it. The same steps wait for
  whole page loads there.
- **webship-js's own steps** (`I press "…"`, `I click "…"`) do not wait for the app. Tag a scenario
  `@settle-after-steps`, and after each of its steps the pack waits for the app to come to rest, on a page with
  client-side code; or follow such a step with `When I wait for the app to come to rest`.
- **A button with a label and no text** (an icon) is found by webship-js's `I press "…" by attr` (its `aria-label`).

### What the suite tests

The features of this repository run every step of the pack against the demo, in CI on every change, in a browser with
JavaScript and in one without:

- the app taking the page over, and a page built without client-side code;
- navigation: a link that stays in the app, the announcement of the new page's title, the link of the current page,
  where the keyboard starts after it, the browser's back, a link the pointer rested on, a page without client-side
  code reached inside the app, and the whole page loads out of such a page and in a browser without JavaScript;
- the counter of the home page, whose spring moves by frames, with webship-js's own `I press` and the opt-in settle;
- the word game's form: a word it knows accepted, one it does not know refused, sent inside the page with JavaScript
  and with a page load without it;
- the error page of an address the app does not know.

Not tested: snapshots, shallow routing, streamed data, a service worker, and the development server's overlay.

## Requirements

- Node.js 24 or later
- A webship-js 2.0 test project, webship-js 2.0.18 or later
- A SvelteKit app, built and served (proven on SvelteKit 3.4 with Svelte 5.59, built with the Node adapter)

## Install

```bash
npm install --save-dev @webship-js/svelte-steps
```

## Quick start

1. Add the step files to the `require` list of your webship-js `cucumber.js`, after webship-js's own:

   ```javascript
   require: [
     'node_modules/webship-js/tests/step-definitions/**/*.js',
     'node_modules/@webship-js/svelte-steps/tests/step-definitions/*.js',
     'tests/step-definitions/**/*.js',
   ],
   ```

2. Point `launchUrl` at the app:

   ```javascript
   worldParameters: {
     launchUrl: process.env.LAUNCH_URL || 'https://app.example.com',
   },
   ```

3. Write a feature from what the app shows:

```gherkin
Feature: Signing in
  Scenario: A wrong password is refused
    Given I am on "/login"
    When I fill in "Email" with "ada@example.com"
    And I fill in "Password" with "wrong"
    And I submit the form with the "Log in" button
    Then the app should have refused the form
    And I should see "Wrong email or password"
```

Run `npx cucumber-js --dry-run` once: it reports any undefined or ambiguous step before a browser opens.

## Test users

None. The demo has no sign-in, and the steps need no account (an app's own sign-in form is submitted with the steps of
the pack, like any other form). `cucumber.js` lists no accounts and no scenario signs in:

```json
{}
```

## What is included

| File | Steps | Covers |
| --- | --- | --- |
| `svelte-app.steps.js` | 4 | The app taking the page over (waited for, or asserted), a page without client-side code, and the wait for the app to come to rest; the opt-in `@settle-after-steps`. |
| `svelte-navigation.steps.js` | 7 | A link followed and the browser's back, each to its end; a link pointed at; how the last navigation ended (inside the app, or a whole page); the announcement of the new page; the link of the current page; where the keyboard starts. |
| `svelte-forms.steps.js` | 3 | A form submitted with a button, in either mode; whether the app accepted or refused it; how it was sent. |
| `svelte-errors.steps.js` | 1 | An error page: its status and its first heading, and its message. |
| `svelte-helpers.js` | | Shared plumbing for the files above and for your own steps: the wait budgets, the poll on the page, the app taking the page over, coming to rest, following a navigation to its end, finding a link or a button by its name, the failure messages (which name the lane without JavaScript). It registers no step. |
| `svelte-probe.js` | | The page side: put into every page before its own scripts, it keeps an id for each document, the frames the page asks for, its fetches in flight, its inputs and changes, and the texts of the route announcer. It registers no step. |

webship-js's own steps still go to an address (`Given I am on "/sverdle"`), read the page (`I should see "…"`), fill in
fields and press keys: this pack adds the app's own navigation, its forms' actions and their waits.

## How the steps find things and wait

- **By the name a person reads.** A link or a button by its accessible name (its text, or its label), as Playwright
  computes it: exactly, then without regard to case, then by its start (three characters or more); never a part in the
  middle. A form's button among the buttons of the page's forms.
- **Taking the page over first.** Every step that acts waits for the app to take the page over, when the page loads
  its start script and the browser runs JavaScript.
- **A navigation to its end, never by a request.** Inside the app: the address has changed, the route announcer says
  the new page's title, and the page has come to rest. A whole page: a new document has loaded and, when it can be,
  been taken over. A link to the address the page is on ends when the page has come to rest.
- **A form in either mode.** After the click, whichever comes first: the action sent inside the page (its answer, then,
  when it succeeded, the page's data asked for again), or a page load (the posted form's answer). A button the app
  handles in the page, sending nothing, ends when the page has come to rest.
- **Coming to rest:** no page load in progress, no request in flight, no frame asked for, no finite animation or
  transition running, the page taken over when it can be, and 40 ms of quiet with a frame after the last input (or
  100 ms of nothing).
- **Then steps wait for what they expect,** up to the step's budget (`minWaitTime.page`, at least 10 seconds), looking
  every 50 milliseconds from Node.js.
- **Failures say what was found,** and a failure in a browser without JavaScript says so: `Expected the app to have
  taken over the page, but the browser has JavaScript off.`

### Notes on waits

What the app does that a test must wait past, found by recording it in a real browser:

- **The announcer is not in the server's HTML.** The app renders it once it has mounted, a few tens of milliseconds
  after the page has loaded: present means taken over.
- **A link the pointer rested on is fetched ahead.** With `data-sveltekit-preload-data="hover"` (the create flow's
  default), pointing at a link fetches the page's code and data, and the click after it sends no request at all.
- **A page without client-side code, reached from a page the app has taken over, still comes inside the app:** only a
  direct load of it has no client-side code.
- **An address the app does not know is a whole page load**, even from a link of a page the app has taken over: the
  error page comes with its status.
- **A spring moves by frames, not animations.** The counter's digits move for about a third of a second after a tap,
  and the browser lists no animation meanwhile; a refused word shakes with a CSS animation (500 ms). The steps wait for
  both.
- **A page step waited 10 seconds on an app** (SvelteKit 3 checks for a new version from a one-hour timer, which the
  settle counted): fixed in webship-js 2.0.18.

## Steps

One example of each step; the JSDoc block above each definition holds five.

### `svelte-app.steps.js` (4)

- `Given the app has taken over the page`
- `Then the app should have taken over the page`
- `Then the page should have no client-side code`
- `When I wait for the app to come to rest`

### `svelte-navigation.steps.js` (7)

- `When I follow the "Sverdle" link in the app`
- `When I go back in the app`
- `When I point at the "Sverdle" link`
- `Then the last navigation should have stayed in the app`
- `Then the navigation should be announced as "Sverdle"`
- `Then the "Sverdle" link should mark the current page`
- `Then I should be at the top of the page for the keyboard`

### `svelte-forms.steps.js` (3)

- `When I submit the form with the "enter" button`
- `Then the app should have accepted the form`
- `Then the form should have been sent without loading the page`

### `svelte-errors.steps.js` (1)

- `Then the page should show the 404 error`

## Phrases shared with other packs

None of this pack's phrases matches one of webship-js (`npm run test:examples` checks it), nor one of the 53 step packs
published so far, and none of their examples matches one of this pack's steps. The Next.js pack speaks of the same
things in words of its own ("without a full page reload", "route announcer", "hydrated page"), and the Flutter pack's
"the app should …" phrases are told apart by theirs, so the pack loads beside any of them.

## SvelteKit's own tests and this pack

SvelteKit's own suite (`packages/kit/test/apps`, MIT) drives its test apps with Playwright in two projects, with
JavaScript and without, and waits for a marker its test apps add when they start (`body.started`), which a real app
does not have: this pack waits on the route announcer instead. Its groups, and the features that cover the same ground
on a real app:

| SvelteKit's own suite | In this pack |
| --- | --- |
| `routing`, `navigation`, `goto`: client-side navigation and its history | `navigation.feature`: a link inside the app, the browser's back, the current link, where the keyboard starts |
| `data-sveltekit attributes`: preloading on hover, reload, noscroll, keepfocus | `navigation.feature`: a link the pointer rested on, fetched ahead |
| `Page options`: `csr = false`, `ssr = false` | `start.feature`, `navigation.feature`: a page without client-side code, loaded directly and reached inside the app |
| `Actions`: `use:enhance`, failures, refreshes | `forms.feature`: a word accepted and one refused, inside the page and with a page load |
| `a11y`: the route announcer, focus after a navigation | `navigation.feature`: the announcement of the new page, where the keyboard starts |
| errors in the right layout, the closest error page | `errors.feature`: the error page of an unknown address, its status and its message |
| the two projects, `js` and `no-js` | the two lanes of this repository's CI, JavaScript on and off |

Not in this pack: `Invalidation` beyond a form's, `Snapshots`, `Streaming`, `Shallow routing` and the development-only
behaviour.

## Testing this package

```bash
npm install
npm run demo:build         # the demo of the create flow, made and built in a Node.js container, in demo/
npm run demo:serve &       # served at http://127.0.0.1:3000
npm run test:examples      # the examples and the features against the step patterns
npm run test:paths         # a feature or a scenario named on the command line runs alone
npx cucumber-js --dry-run  # no undefined and no ambiguous step
LAUNCH_URL=http://127.0.0.1:3000 npm test                 # the suite, with JavaScript
LAUNCH_URL=http://127.0.0.1:3000 npm run test:must-fail   # assertions that must fail, each with its message
```

The lane without JavaScript:

```bash
JAVASCRIPT=off CUCUMBER_TAGS='not @wip and not @must-fail and not @needs-javascript' LAUNCH_URL=http://127.0.0.1:3000 npm test
JAVASCRIPT=off MUST_FAIL_TAGS='@must-fail and not @needs-javascript' LAUNCH_URL=http://127.0.0.1:3000 npm run test:must-fail
```

The tags: `@needs-javascript` runs only with JavaScript, `@no-javascript` only without (not `@javascript`, which
webship-js reads as "fail the scenario on any browser error"). In CI each lane names its reports
(`cucumber_report-javascript-off.json`, `must-fail-javascript-off.json`), so a failure of one is never read as the
other's.

`tests/must-fail/` holds scenarios that assert something that is not true of the demo. `npm run test:must-fail` runs
them and checks that each one fails at its last step, with the message it announces and a hint: a step that cannot
fail proves nothing. It runs them with a wait of 3 seconds (`COMPONENT_WAIT_MS`), since each of them waits its whole
budget.

`LAUNCH_URL` points the suite at another address; `npx cucumber-js tests/features/forms.feature` runs one feature;
`FEATURES` runs a subset too; `CUCUMBER_TAGS=@critical` runs the smoke lane; `HEADLESS=false` shows the browser.

The suite leaves the demo as it found it: the game keeps its state in a cookie of each scenario's own browser.

## The demo

The demo is made, not kept in this repository. [`.github/scripts/build-demo.sh`](.github/scripts/build-demo.sh) runs
the official create tool, `sv create --template demo --types ts --add sveltekit-adapter=adapter:node` (sv 1.7.1), and
`npm run build`, in a Node.js 24 container pinned by its digest, into `demo/`;
[`.github/scripts/serve-demo.sh`](.github/scripts/serve-demo.sh) serves the build with the adapter's own server,
with `ORIGIN` set to the address the browser opens.

- The create tool and its templates are released under the MIT licence by the Svelte contributors
  (https://github.com/sveltejs/cli). Nothing of the demo is in this repository: the steps and the features of this
  pack are its own.
- SvelteKit's and Svelte's own suites (MIT) were read, to learn what the framework does that a test must wait for;
  nothing of them is in this repository either.

## How the steps were written

Everything a step relies on was seen in a real browser first, on the built demo: when the app takes a page over and
what it renders then, what a navigation inside the app and a whole page load each change, the requests of a form with
JavaScript and without, the frames of a spring and the animation of a refused word, where the keyboard focus goes. The
steps were written from that, and are proven on SvelteKit 3.4 with Svelte 5.59 and the Node adapter, in English, with
Chromium, with JavaScript and without.

## License

MIT (see `LICENSE`).

## Logo

The Svelte logo in this README comes from Simple Icons 16.37.0, filled with the colour the set lists for the brand;
the set is CC0-1.0 and takes the mark from Svelte's branding repository (https://github.com/sveltejs/branding). The
Svelte name and logo are trademarks of their owner; this pack is not affiliated with or endorsed by them.
