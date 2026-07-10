# wickedagile.com

The umbrella landing page for the **wicked-\*** family of local-first, AI-native
developer tools — and the **canonical style source** for the family. The design
tokens, fonts, theme system, topbar, footer, and hero terminal defined here are
the reference the sibling sites (wicked-garden, wicked-interactive, wicked-estate, …)
are meant to match.

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

Published to **GitHub Pages**. A dormant, human-gated workflow lives at
`.github/workflows/pages.yml` — it runs **only** on manual `workflow_dispatch`
(never on push/merge), so go-live is always a deliberate human action. It builds
the static site and publishes `dist/` via `upload-pages-artifact` →
`deploy-pages`. The custom domain is set via `public/CNAME` (`wickedagile.com`),
so the Astro `site` is `https://wickedagile.com` with no `base` path.

## Sections

Every section is implemented and content-complete:

- `src/components/Hero.astro` — the live auto-typing terminal (`/articles`,
  `/projects`, `/about`; disabled on mobile).
- `src/components/Articles.astro` — the "yes, and…" dispatch feed, baked from
  the Medium RSS at build time (`src/lib/articles.mjs`).
- `src/components/Shipped.astro` — the "shipped." split-editor IDE. A file-tree
  of the **ten marketed packages** (the 5 products + the 5-repo foundation)
  drives a dual-mode preview: browser-frame screenshots for the 3 deployed sites,
  faux code-editor cards for the libraries. Absorbed packages and wicked-vault
  (a wicked-garden peer, not a headline product) are intentionally excluded.
- `src/components/About.astro` — the multi-chapter career rail (~30 years, five
  chapters).

The shared chrome — tokens, fonts, theme system, topbar/nav, footer, and the
`SameGarden` cross-promo grid — comes from the `wicked-web` package, and this
site is the canonical source those tokens are defined against.
