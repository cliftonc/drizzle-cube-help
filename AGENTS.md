# Repository Guidance

## Project overview

This repository is an Astro/Starlight documentation site for Drizzle Cube. It builds a static docs site and ships a Cloudflare Worker (`src/worker.ts`) that serves static assets with directory-index and root-index fallback behavior.

## Key paths

- `src/content/docs/` — Starlight documentation content.
- `src/pages/llms.txt.ts` — Astro route that emits the LLM-friendly documentation index.
- `src/pages/[...slug].md.ts` — Markdown route for documentation pages.
- `src/worker.ts` — Cloudflare Worker asset routing/fallback logic.
- `src/data/` — Chart demo registry and sample data used by docs examples.
- `scripts/sync-external-content.js` — External documentation sync used by the build.
- `astro.config.mjs` — Astro/Starlight site configuration.

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`

## Guardrail notes

Keep tests focused on routing, generated markdown/LLM output, and chart demo registry/data invariants. Avoid editing generated `public/coverage/**` unless intentionally updating static coverage artifacts.
