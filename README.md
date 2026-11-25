<p align="center"><img src="https://raw.githubusercontent.com/webship/svelte-steps/2.0.x/assets/logo.svg" alt="Svelte logo" width="96"></p>

# svelte-steps

Cucumber step definitions for Svelte apps, SvelteKit first, with [webship-js](https://webship.co/docs/webship-js/2.0.x),
a BDD browser automation harness built on Playwright and Cucumber-js.

A SvelteKit page arrives as HTML from the server, then the app takes it over in the browser (hydration): until then
its links load whole pages and its buttons do nothing. The steps wait for that moment, follow the app's own
navigation between pages, submit its forms with and without JavaScript, and wait on its data loads, its error pages
and its transitions, never for a fixed time. No step phrase names the framework.

The steps, their features, the sample app and CI come with the first release, `2.0.0`.

## License

MIT (see `LICENSE`).

## Logo

The Svelte logo in this README comes from Simple Icons 16.37.0, filled with the colour the set lists for the brand;
the set is CC0-1.0 and takes the mark from Svelte's branding repository (https://github.com/sveltejs/branding). The
Svelte name and logo are trademarks of their owner; this pack is not affiliated with or endorsed by them.
