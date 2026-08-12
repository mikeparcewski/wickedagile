```
          _      _            _             _ _
__      _(_) ___| | _____  __| | __ _  __ _(_) | ___
\ \ /\ / / |/ __| |/ / _ \/ _` |/ _` |/ _` | | |/ _ \
 \ V  V /| | (__|   <  __/ (_| | (_| | (_| | | |  __/
  \_/\_/ |_|\___|_|\_\___|\__,_|\__,_|\__, |_|_|\___|
                                      |___/
```

# wickedagile.com

The owner's **personal apex** — one architect's body of work: the things he
builds (the **wicked-\*** platform, four planes) and the things he publishes
(the dispatch feed), finishing with a little about him. The product *selling*
lives on the per-product deep-dive sites (wc/we/wg/wi/ws); this page shows the
work and links out. It is also the **canonical style source** for the family:
the design tokens, fonts, theme system, topbar, footer, and hero terminal
defined here are the reference the sibling sites (wicked-garden,
wicked-interactive, wicked-estate, …) are meant to match.

## Tech

- **[Astro](https://astro.build) — static output.** Zero client-side framework
  runtime. The page ships as plain HTML/CSS plus a few small, self-contained
  per-component scripts (the theme toggle + ecosystem dropdown in the topbar, and
  the hero terminal session).
- **Design tokens** live in `src/styles/tokens.css` (the `:root` + `[data-theme="light"]`
  custom properties and the global base) and are imported via `src/styles/global.css`.
- **Shared data module** (`src/scripts/data.js`) holds the Medium RSS CORS-proxy
  race, the GitHub repos fetch, the helpers, and the `FEATURED` site list. The hero
  terminal (`src/scripts/terminal.js`) imports from it; the finalized middle
  sections will too.

## Develop

```bash
npm install
npm run dev      # local dev server with HMR
```

## Build

```bash
npm run build    # static site → dist/
npm run preview  # preview the production build locally
```

## Deploy

Published to **GitHub Pages**. A single workflow lives at
`.github/workflows/pages.yml` — it **auto-deploys on every push to `main`** and
is still runnable by hand via `workflow_dispatch`. It builds the static site and
publishes `dist/` via `upload-pages-artifact` → `deploy-pages`. The custom domain
is set via `public/CNAME` (`wickedagile.com`), so the Astro `site` is
`https://wickedagile.com` with no `base` path.

## Sections

Every section is implemented and content-complete, in page order:

- `src/components/Hero.astro` — the builder/writer hero ("The best code tells
  a story. The best stories have architecture.") with the live auto-typing
  terminal (`/articles`, `/projects`, `/about`; disabled on mobile).
- `src/components/Shipped.astro` — "the platform.": what I've been building,
  as the **four-plane stack** (two skins, one control plane, one catalog, one
  record). Foundation (wicked-estate) → Capability (wicked-garden) → Control
  (wicked-crew) → the Experience capstone holding both skins (studio ·
  wicked-interactive), with the contract named on every seam. A spine pulse
  rises foundation → skins; every block drives a dual-mode preview
  (browser-frame screenshots for the 4 live sites, a faux code-editor card for
  studio, which ships inside crew) and links out to the plane's own deep-dive
  site. The retired "build on it." Extend band survives as one outro line
  linking to garden's `#extend`. Retired/absorbed packages (testing → garden +
  crew, brain → estate, bus/vault/ledger internal, core inside crew) are not
  shown as standalone products.
- `src/components/Articles.astro` — the "yes, and…" dispatch feed, baked from
  the Medium RSS at build time (`src/lib/articles.mjs`).
- `src/components/About.astro` — the closer: the multi-chapter career rail
  (~30 years, five chapters).

The shared chrome — tokens, fonts, theme system, topbar/nav, footer, and the
`SameGarden` four-plane map — comes from the `wicked-web` package, and this
site is the canonical source those tokens are defined against.
