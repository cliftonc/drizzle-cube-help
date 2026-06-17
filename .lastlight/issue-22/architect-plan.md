# Architect Plan for #22 — Basic Guardrails

## Problem Statement

The repository currently has build/deploy scripts but no guardrail scripts: `package.json:5` defines `scripts`, but there is no `lint`, `test`, or `typecheck` entry, and `package.json:30` has only `pagefind`, `vite`, and `wrangler` in dev dependencies. The guardrails report confirms the expected starting point is a bootstrap build: test framework missing, linting missing, typecheck script missing, and CI missing (`.lastlight/issue-22/guardrails-report.md:5-17`). Critical behavior worth protecting is concentrated in the Cloudflare static asset worker (`src/worker.ts:5` / `fetch`, especially path fallback at `src/worker.ts:12`, `src/worker.ts:20`, and `src/worker.ts:39`) and the LLM documentation index generator (`src/pages/llms.txt.ts:4` `SECTIONS`, `src/pages/llms.txt.ts:18` `sectionKey`, `src/pages/llms.txt.ts:24` `mdUrl`, `src/pages/llms.txt.ts:28` `GET`).

## Summary of what needs to change

Add a minimal, focused developer guardrail stack:

- Add npm scripts for `lint`, `test`, and `typecheck`.
- Add ESLint flat config focused on critical TypeScript files and tests, excluding generated coverage and build output.
- Add Vitest config and tests for worker routing/fallback behavior, LLM text formatting, and chart demo registry invariants.
- Extract pure LLM formatting helpers out of the Astro route so they can be tested without mocking `astro:content`.
- Add a concise `AGENTS.md` describing repo structure and commands for future agents.
- Add a basic GitHub Actions workflow that runs install, lint, typecheck, and tests.

## Files to modify — exhaustive manifest

### Existing files to change

1. `package.json`
   - Anchor: `scripts` object at `package.json:5`.
   - Add these scripts exactly:
     - `"lint": "eslint src/worker.ts src/pages/*.ts src/data/*.ts src/lib/**/*.ts \"src/**/*.test.ts\""`
     - `"test": "vitest run"`
     - `"typecheck": "astro check"`
   - Anchor: `devDependencies` object at `package.json:30`.
   - Add dev dependencies required by the scripts/config:
     - `"@astrojs/check"`
     - `"@eslint/js"`
     - `"eslint"`
     - `"globals"`
     - `"typescript"`
     - `"typescript-eslint"`
     - `"vitest"`
   - Use `npm install --save-dev @astrojs/check @eslint/js eslint globals typescript typescript-eslint vitest` so versions and the lockfile are resolved consistently.

2. `package-lock.json`
   - Anchor: root package metadata and dependency tree.
   - Update via the same `npm install --save-dev ...` command above; do not hand-edit.

3. `src/worker.ts`
   - Anchor: `export interface Env` at `src/worker.ts:1`.
   - Replace the Cloudflare-specific global `Fetcher` dependency with a local minimal asset fetcher type so `astro check` can validate the repo without generated Wrangler types:
     - Add `interface AssetFetcher { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>; }`
     - Change `ASSETS: Fetcher;` to `ASSETS: AssetFetcher;`.
   - Anchor: `catch (error)` at `src/worker.ts:42`.
   - Change to `catch {` to avoid an unused variable lint failure.
   - Do not otherwise change routing behavior; tests should describe the current behavior.

4. `src/pages/llms.txt.ts`
   - Anchors:
     - `SECTIONS` at `src/pages/llms.txt.ts:4`.
     - `sectionKey` at `src/pages/llms.txt.ts:18`.
     - `mdUrl` at `src/pages/llms.txt.ts:24`.
     - `GET` at `src/pages/llms.txt.ts:28`.
   - Move pure helpers and formatting into new `src/lib/llms.ts`.
   - Leave only Astro-specific route code here:
     - imports: `getCollection`, `APIRoute`, and `formatLlmsTxt` from `../lib/llms`.
     - `GET` computes `origin`, loads `docs`, calls `formatLlmsTxt(docs, origin)`, and returns `Response` with `Content-Type: text/plain; charset=utf-8`.
   - Preserve current output text and section order.

5. `.lastlight/issue-22/status.md`
   - Replace existing phase metadata with:
     - `current_phase: architect`

### New files to add

6. `src/lib/llms.ts`
   - New pure utility module for the `llms.txt` route.
   - Export these exact identifiers:
     - `SECTIONS`
     - `LlmsDocEntry` interface with `id: string` and `data: { title?: string; description?: string }`
     - `sectionKey(id: string): string`
     - `mdUrl(origin: string, id: string): string`
     - `groupDocsBySection<T extends LlmsDocEntry>(docs: readonly T[]): Record<string, T[]>`
     - `formatLlmsTxt(docs: readonly LlmsDocEntry[], origin: string): string`
   - `SECTIONS` must contain the same 11 keys/titles currently in `src/pages/llms.txt.ts`:
     - `_root` / `Overview`
     - `getting-started` / `Getting Started`
     - `semantic-layer` / `Semantic Layer`
     - `ai` / `AI Features`
     - `client` / `Client Components`
     - `adapters` / `Adapters`
     - `examples` / `Examples`
     - `advanced` / `Advanced`
     - `guides` / `Guides`
     - `api-reference` / `API Reference`
     - `contributing` / `Contributing`
   - Preserve current fallback behavior: unknown top-level sections group under `_root`; `index` maps to `${origin}/index.md`; nested docs map to `${origin}/${id}.md`; entries sort by `id` within each section.

7. `src/lib/llms.test.ts`
   - New Vitest tests for `src/lib/llms.ts`.
   - Cover these identifiers and behaviors:
     - `sectionKey('index') === '_root'`
     - `sectionKey('getting-started/quick-start') === 'getting-started'`
     - unknown section such as `reference/foo` returns `_root`
     - `mdUrl('https://example.test', 'index') === 'https://example.test/index.md'`
     - `mdUrl('https://example.test', 'client/charts') === 'https://example.test/client/charts.md'`
     - `formatLlmsTxt` trims a trailing slash from the origin, groups by `SECTIONS` order, sorts entries by `id`, emits descriptions only when present, and includes the existing Drizzle Cube heading/intro copy.

8. `src/worker.test.ts`
   - New Vitest tests for `src/worker.ts` default export.
   - Use a local mock `env` with `ASSETS.fetch` recording requested URLs and returning configured `Response` objects.
   - Cover at least:
     - `/` returns the direct asset when status is `< 400`.
     - an extension path such as `/favicon.ico` returns the direct asset when status is `< 400`.
     - extensionless `/semantic-layer` tries `/semantic-layer/index.html` and returns it when status is `< 400`.
     - extensionless `/semantic-layer/` tries `/semantic-layer/index.html` and returns it when status is `< 400`.
     - missing paths fall back to `/index.html`.
   - Keep tests behavior-focused; do not require internals other than recorded request URLs.

9. `src/data/chartDemoRegistry.test.ts`
   - New Vitest tests for `src/data/chartDemoRegistry.ts` and sibling data in `src/data/chartDemoData.ts`.
   - Enumerate and assert the current registry keys exactly:
     - `bar`, `line`, `area`, `pie`, `scatter`, `radar`, `radialBar`, `treemap`, `bubble`, `activityGrid`, `table`, `kpiNumber`, `kpiDelta`, `kpiText`, `markdown`, `funnel`, `sankey`, `sunburst`, `retentionHeatmap`, `heatmap`.
   - Assert every registry entry has `chartType`, an array `data`, and an object `chartConfig`.
   - Assert selected critical mappings: `bar.chartConfig.xAxis` is `["date"]`, `bar.chartConfig.yAxis` is `["revenue", "orders"]`, `bubble.chartConfig.sizeField` is `"z"`, `activityGrid.data.length` is `365`, and `markdown.displayConfig.content` is a non-empty string.

10. `eslint.config.js`
    - New ESLint v9 flat config.
    - Use `@eslint/js`, `typescript-eslint`, and `globals`.
    - Ignore these generated/vendor paths exactly:
      - `dist/**`
      - `.astro/**`
      - `public/coverage/**`
      - `node_modules/**`
    - Apply to `**/*.{js,mjs,ts,tsx}` with ESM source type and browser/node globals.
    - Recommended TypeScript rules are fine, but explicitly disable `@typescript-eslint/no-explicit-any` if needed so the current chart demo integration does not block the focused lint step.

11. `vitest.config.ts`
    - New Vitest config.
    - Use `defineConfig` from `vitest/config`.
    - Configure:
      - `test.environment: 'node'`
      - `test.include: ['src/**/*.test.ts']`
      - optional `test.clearMocks: true`

12. `.github/workflows/guardrails.yml`
    - New CI workflow.
    - Trigger on `push` and `pull_request`.
    - Use `actions/checkout@v4`, `actions/setup-node@v4` with Node 20 and npm cache.
    - Run exactly:
      - `npm ci`
      - `npm run lint`
      - `npm run typecheck`
      - `npm run test`

13. `AGENTS.md`
    - New concise repo-specific guidance.
    - Include factual sections:
      - project overview: Astro/Starlight docs site for Drizzle Cube, static build plus Cloudflare Worker asset fallback.
      - key paths: `src/content/docs/`, `src/pages/llms.txt.ts`, `src/pages/[...slug].md.ts`, `src/worker.ts`, `src/data/`, `scripts/sync-external-content.js`, `astro.config.mjs`.
      - commands: `npm install`, `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test`.
      - guardrail note: keep tests focused on routing, generated markdown/LLM output, and chart demo registry/data invariants; avoid editing generated `public/coverage/**` unless intentionally updating static coverage artifacts.

### Critical TypeScript source set inventory

The focused lint/test guardrails concern these existing source files; executor should not need to rediscover siblings:

- `src/worker.ts`
- `src/pages/llms.txt.ts`
- `src/pages/[...slug].md.ts`
- `src/data/chartDemoData.ts`
- `src/data/chartDemoRegistry.ts`
- `src/content.config.ts` (not in focused lint script unless executor broadens scope)
- `vite.config.worker.ts` (not in focused lint script unless executor broadens scope)
- `src/components/ChartDemo.tsx` (React integration; intentionally outside focused lint script because it currently uses upstream chart component `any` casts)

## Commands

From `.lastlight/issue-22/guardrails-report.md`, the current exact status is that commands are missing and must be bootstrapped:

- Test Framework: MISSING — package.json has no test script and no test runner dependency.
- Linting: MISSING — no ESLint dependency or lint script.
- Type Checking: PARTIAL — `tsconfig.json` exists but no `typecheck`/`tsc` script.
- CI Pipeline: MISSING — no `.github/workflows/` directory.

Executor should establish and then use these exact commands directly:

```bash
npm run lint
npm run typecheck
npm run test
```

Recommended install/update command for the bootstrap:

```bash
npm install --save-dev @astrojs/check @eslint/js eslint globals typescript typescript-eslint vitest
```

## Implementation approach

1. Install dev tooling with `npm install --save-dev @astrojs/check @eslint/js eslint globals typescript typescript-eslint vitest` to update `package.json` and `package-lock.json`.
2. Add `lint`, `typecheck`, and `test` scripts to `package.json` exactly as listed in the manifest.
3. Add `eslint.config.js` with focused ignores and TypeScript-aware recommended rules.
4. Add `vitest.config.ts` for Node-environment unit tests under `src/**/*.test.ts`.
5. Refactor `src/pages/llms.txt.ts` by moving `SECTIONS`, `sectionKey`, `mdUrl`, grouping, and formatting into `src/lib/llms.ts`; keep the Astro route thin and output-compatible.
6. Update `src/worker.ts` to use a local `AssetFetcher` type and `catch {`.
7. Add the three test files: `src/lib/llms.test.ts`, `src/worker.test.ts`, and `src/data/chartDemoRegistry.test.ts`.
8. Add `.github/workflows/guardrails.yml` to run the new guardrails in CI.
9. Add concise `AGENTS.md` with repo structure and commands.
10. Run verification in this order and fix any failures:
    - `npm run lint`
    - `npm run typecheck`
    - `npm run test`
    - optionally `npm run build` for integration confidence, noting it runs `sync:external` first.

## Risks and edge cases

- `astro check` can surface pre-existing type errors that the current build path does not catch; the worker `Fetcher` type is the most obvious likely issue and is addressed in the plan.
- Importing Astro virtual modules (`astro:content`) in Vitest is brittle, so tests should target extracted pure helpers in `src/lib/llms.ts` instead of importing the route directly.
- `activityGridData` uses current date and random counts (`src/data/chartDemoData.ts:90-98`), so tests should assert stable invariants such as length and date-string shape, not exact dates/count values.
- Keep ESLint scope focused. Broad linting across all docs, generated coverage HTML, or React integration casts may create noisy failures unrelated to this issue.
- The build script runs external content sync; if executor runs `npm run build`, ensure no unintended synced documentation changes are committed unless they are expected.

## Test strategy

- Unit-test pure LLM formatting behavior to protect public `llms.txt` output order, URLs, descriptions, and origin normalization.
- Unit-test Cloudflare worker routing with a mocked `ASSETS.fetch` to protect direct asset serving, extensionless directory index behavior, trailing-slash handling, and root fallback.
- Unit-test chart demo registry shape and selected mappings to catch accidental demo breakage while avoiding snapshotting large/random sample data.
- Verify all new guardrails with `npm run lint`, `npm run typecheck`, and `npm run test`; CI should run the same commands on every push/PR.

## Estimated complexity

Medium.
