# Drizzle Cube Documentation

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

This repository contains the Astro/Starlight documentation site for Drizzle Cube. It builds a static site and includes a Cloudflare Worker for production asset routing and fallback behavior.

## Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 22 or newer
- npm 9.6.5 or newer

## Local development

Start from a clean checkout and install the versions locked in `package-lock.json`:

```bash
git clone https://github.com/cliftonc/drizzle-cube-help.git
cd drizzle-cube-help
npm ci
npm run dev
```

The development site is available at <http://localhost:4321> by default.

`npm run dev` runs the external-content sync before starting Astro. The sync may print warnings when optional sibling repositories are absent; this does not prevent the checked-in documentation from being served.

### Configuration and external content

No environment variables or supporting services are required for local development, builds, or previews.

The repositories referenced by `help-content-config.json` are optional sibling checkouts alongside this repository:

- `drizzle-cube`
- `drizzle-cube-express`
- `drizzle-cube-fastify`
- `drizzle-cube-hono`
- `drizzle-cube-nextjs`

`help-content-config.json` is the authoritative mapping from external source files to documentation pages. Both `npm run dev` and `npm run build` run the sync automatically; use the following command to request an explicit refresh:

```bash
npm run sync:external
```

The sync reports incomplete refreshes rather than hiding them:

- A missing configured source is warned about and skipped, leaving the checked-in page in place.
- A missing sibling coverage folder is warned about and skipped.
- A per-source filesystem failure while reading or writing is reported as an error for that source while processing continues. Treat that message as an indication that the affected page was not refreshed.
- An invalid `help-content-config.json` fails the command and must be corrected.

## Production build and preview

Build the static Astro output in `dist/`, then preview that output locally:

```bash
npm run build
npm run preview
```

The preview serves Astro's static output; it does not emulate the Cloudflare Worker routing in `src/worker.ts`.

## Contributor checks

```bash
npm test          # Run the test suite
npm run lint      # Check source formatting and lint rules
npm run typecheck # Run Astro and TypeScript checks
```

## Project structure

```text
src/
├── content/docs/                # Documentation content (Markdown/MDX)
├── pages/                       # Generated Markdown and LLM-facing routes
├── data/                        # Chart demo registry and sample data
├── styles/                      # Site styles
└── worker.ts                    # Cloudflare Worker asset routing
public/                          # Static assets
scripts/
└── sync-external-content.js     # External documentation sync
help-content-config.json         # External source-to-page mappings
astro.config.mjs                 # Astro and Starlight configuration
wrangler.toml                    # Cloudflare Worker configuration
```

## Content management

### Adding content

1. Create a `.md` or `.mdx` file in `src/content/docs/`.
2. Add frontmatter with a `title` and, optionally, a `description`.
3. Update the sidebar navigation in `astro.config.mjs` when needed.

For externally maintained pages, update the source mapping in `help-content-config.json` and keep the relevant sibling repository optional for standalone contributors.

## Deployment

Deployment in this repository is configured for a Cloudflare Worker through `wrangler.toml`:

```bash
npm run deploy         # Production deployment
npm run deploy:staging # Staging deployment
```

Cloudflare authentication and access to the configured account are required only for these deployment commands; they are not required for local development, building, testing, or previewing. Wrangler surfaces missing or invalid credentials as a command failure.

The static output can be adapted to another hosting provider, but this repository does not include Vercel, Netlify, GitHub Pages, or other provider configuration. An alternative deployment must recreate any required routing and fallback behavior from `src/worker.ts`.

## Customization

- Edit `src/styles/custom.css` for custom styles.
- Configure navigation, site metadata, and social links in `astro.config.mjs`.

## Documentation

- [Starlight documentation](https://starlight.astro.build/)
- [Astro documentation](https://docs.astro.build/)
