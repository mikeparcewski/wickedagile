```
          _      _            _             _ _
__      _(_) ___| | _____  __| | __ _  __ _(_) | ___
\ \ /\ / / |/ __| |/ / _ \/ _` |/ _` |/ _` | | |/ _ \
 \ V  V /| | (__|   <  __/ (_| | (_| | (_| | | |  __/
  \_/\_/ |_|\___|_|\_\___|\__,_|\__,_|\__, |_|_|\___|
                                      |___/
```

# wickedagile.com

The company site: **we write about the work, and the tools are the receipts.** Essays and interactive pieces on AI
and how software gets built, each one a thread into the wicked tools that do the work and keep the record. Four
frames that snap:

| Frame | What |
|---|---|
| `#home` | The hero: the decided headline and sub-line (the curated file's `hero`) and the braid art, drawn in code. Its Work line runs on to "Follow a thread". |
| `#graph` | "Follow a thread": the map of Learn (left) and Work (right), with the threads as coloured routes. The thread questions, the Learn and Work checkboxes, the type pills, the side panel (a strip and a Details sheet on phones). |
| `#learn` | The writing and the bits, newest first: the featured piece, cards with covers drawn in code, Show all. |
| `#work` | The lab's showcase: wicked-studio and the Wicked AI Platform placeholder, crew, garden and estate, Get started with Copy, Under the hood. |

The header is wicked-web's family `Topbar` (`here="agile"`) and the footer is the family `Footer`. The site is the
build of the approved design (`DES-SITES-V2` rev 10.2-final, build brief B3).

## How it's built

- **Astro, static output, no client framework.** The page is HTML and CSS plus one script for the map
  (`src/scripts/map.js`; the layout code is ours, no graph library) and one for the hero's line
  (`src/scripts/braid-run.js`). It makes no request at run time.
- **The graph** is built before Astro runs, by `scripts/build-graph.mjs`, into `src/data/graph.built.json`:
  - the curated file `src/content/graph.json`: the threads (name, hook, stops, legs, the quotes that back each hook),
    the Related links, the map positions and short labels, the two door names (`labels`) and the hero;
  - the essays from the Medium feed, the bits (and, later, videos) from `bits.wickedagile.com/bits.json`, and the
    Work facts from the lab's exports (`wickedlabs.ai/data/products.json`, `capabilities.json`). Work facts are never
    typed here.
- **The sources** (`src/lib/sources.mjs`) are fetched at build time. Each falls back to the file this site last
  served (the build publishes what it used under `/data/`), then to a committed seed in `src/data/seed/`. The Medium
  feed carries only the newest ten posts, so the writing is the union of the live feed, the last served file and the
  seed; a post the feed cuts short keeps the text of its last complete copy. Each source passes a shape check of
  everything the build reads (ids are slugs, links plain https URLs, dates real) or the next one is used. Until the
  lab and bits exports are live, the seeds are the design's fixtures. Medium essays are keyed by their post id (the hex
  at the end of the link), so a title edit keeps an essay's threads and links.
- **The build fails on any rule break**: unique ids, a position for every placed piece and a row for every Work mark,
  one edge kind per pair, the Platform placeholder with no edges and nothing but its name, a thread's Learn stops
  before its Work stops with a backing edge for every step, every hook quote found in its essay, every thread and
  Related link carrying `draft: true` or an approval `{by: operator, on: YYYY-MM-DD}`, short non-empty door names, one
  decided hero. A new post or bit lands in the tray (or the Learn list) and is listed as "not in a thread yet". Live
  data can still break a rule the curated file met (a topic that grows past four posts stops being a chain, and a thread
  step that stood on it loses its backing): then the build keeps the last served data, publishes that, and warns in
  the run, so the operator re-curates. A rule the curated file itself breaks fails the build.
  `npm run graph:selftest` proves the rules on broken copies of the inputs.
- **Draft marks are a render setting.** The threads and Related links stay `draft: true` in the data until the
  operator approves them; production hides every draft mark. `SHOW_DRAFTS=1 npm run build` shows them.
- **Door names are data.** `labels` in the curated file names the two doors; every visible use reads it, so "Work"
  becomes "Build" in one edit.

## Develop

```bash
npm install
npm run dev                         # builds the graph, then the dev server
WA_SOURCES=seed npm run build       # the graph from the seeds only (offline), then the static site in dist/
npm run preview                     # serve dist/
npm run graph:selftest              # the graph build's rules
# the e2e suites, as CI runs them: the renamed-door copy, then the site, both from the seeds, then the tests
export WA_SOURCES=seed && npm run build:renamed && npm run build && npm run test:e2e
```

## Tests

`tests/e2e/` (Playwright, Chromium) holds the ports of the design lane's suites; CI (`site-e2e.yml`) runs them on
Linux against the seed build:

| Spec | What it checks |
|---|---|
| `map.spec.ts` | the behaviour suite (test3): the data rules, hover, threads, filters, questions, phone, motion, fit, the review folds, no-JS, the hero, Learn, Work, the door names (with a renamed build), deep links, focus and the final review's folds |
| `oracle.spec.ts` | the layout oracle (audit3): the page's `__audit()` over 251 states at five viewports and both themes |
| `frames.spec.ts` | the frame rule: every frame centred and nothing cut off at five viewports; 40 px around the map at 1440x700 and 1280x660 |
| `chrome.spec.ts` | the family header and footer on this site |
| `smoke.spec.ts` | the render smoke: 19 states at 1440x700, 1280x660 and 390x844 in both themes, with no overflow, clipped text, fused words, contrast failures, requests to other origins or page errors |
| `v3.spec.ts` | the live page's smoke checks |

`window.__audit` (the layout oracle) and `window.__map` (the map's state and actions) are the hooks the suites drive.

## Deploy

GitHub Pages, from `.github/workflows/pages.yml`: on every push to `main`, nightly (so a new post or bit publishes
without a PR) and by hand. The deploy build fetches the live sources, runs the graph build and the layout audit
(the oracle and the frame rule), then publishes `dist/`. The custom domain is `public/CNAME` (`wickedagile.com`).
