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

Deployed to **GitHub Pages** via `.github/workflows/deploy.yml` — it builds on
every push to `main` (and on manual `workflow_dispatch`) and publishes `dist/`.
The workflow stays dormant until a remote is added. The custom domain is set via
`public/CNAME` (`wickedagile.com`).

## Status — middle sections stubbed

The three middle sections are **stubs** pending their finalized designs and are
clearly marked `TODO`:

- `src/components/Articles.astro` — the news-console / writing section
  (to be decomposed from `index.next.html`).
- `src/components/Shipped.astro` — the shipped / packages + featured-mosaic
  section (will import `FEATURED` from `src/scripts/data.js`).
- `src/components/About.astro` — the book-chapters about section.

Everything else — tokens, fonts, theme system, topbar/nav, footer, and the hero
terminal — is the faithfully-ported final design.
