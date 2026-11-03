import { defineConfig } from 'astro/config';

// The shared chrome and the design package come from the pinned `wicked-web` git dependency (package.json); there is
// no sibling-checkout alias, so every build (local, CI, Pages) uses the pinned commit.
// https://astro.build/config
export default defineConfig({
  site: 'https://wickedagile.com',
  output: 'static',
  // Astro's HTML compression deletes the space before inline tags (<b>, <code>) and fuses words.
  compressHTML: false,
  // Safari before 16.4 ignores media-query range syntax (`width <= 760px`), so the minifier must keep min-width and
  // max-width: the CSS targets name the oldest browsers the site supports (wickedagile#71, #73)
  vite: { build: { cssTarget: ['chrome100', 'edge100', 'firefox100', 'safari14'] } },
});
