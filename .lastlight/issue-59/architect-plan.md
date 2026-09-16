# Architect Plan — Issue #59

## Problem Statement

The README currently presents an abbreviated quick start that uses `npm install` and omits prerequisites, clean-checkout setup, required/optional configuration, validation commands, and the development URL (`README.md:7-21`). Its claim that external content is simply “automatically synced” does not explain that `dev` and `build` invoke the sync script (`package.json:6-12`), that configured sources are expected in sibling repositories (`help-content-config.json:2-44`), or that missing sources are reported and skipped (`scripts/sync-external-content.js:20-29`). The project structure is also stale because it names a nonexistent `scripts/add-frontmatter.js` (`README.md:23-37`), while production scripts and Cloudflare Worker deployment details are not accurately represented (`package.json:8-11`, `wrangler.toml:1-18`).

## Summary of What Needs to Change

Update the root README into an accurate contributor runbook without changing scripts or runtime behavior. Document supported prerequisites, clean installation, local development, optional external-content sibling repositories, the absence of required local environment variables, production build/preview, quality checks, and Cloudflare deployment prerequisites. Correct the project layout and deployment descriptions so every documented command maps directly to the current package scripts and configuration.

## Files to Modify — Exhaustive Manifest

Only one product file is in scope; there are no locale variants, README siblings, or tests that require synchronized edits for this documentation-only change.

- `README.md`
  - Anchor: introduction and `## 🚀 Quick Start` at lines 1-21.
    - Replace the abbreviated command block with a prerequisite section and clean-checkout workflow.
    - State that contributors need Git, Node.js 22 or newer, and npm (the installed Astro release supports Node 22+, and its package metadata requires npm 9.6.5+).
    - Show cloning `https://github.com/cliftonc/drizzle-cube-help.git`, entering `drizzle-cube-help`, and running deterministic installation with `npm ci` from the committed `package-lock.json`.
    - Document `npm run dev`, its external-content sync side effect, and the default local URL `http://localhost:4321`.
  - Anchor: add a setup/configuration subsection immediately after the local development instructions.
    - Explicitly state that no environment variables or supporting services are required for local development, build, or preview.
    - Explain that repositories named by `help-content-config.json` are optional sibling checkouts: `drizzle-cube`, `drizzle-cube-express`, `drizzle-cube-fastify`, `drizzle-cube-hono`, and `drizzle-cube-nextjs`.
    - Explain the existing behavior rather than changing it: a missing configured source is **warn-and-skip** (the script prints a warning and retains the checked-in page), a missing sibling coverage folder is **warn-and-skip**, and an unreadable/malformed per-source input is **warn-and-surface** through the sync error output while processing continues. Tell users not to treat those visible messages as silently refreshed content.
    - Point contributors to `help-content-config.json` as the authoritative source-to-page mapping and `npm run sync:external` for an explicit refresh.
  - Anchor: current quick-start production commands at lines 16-20 and `## 🚀 Deployment` at lines 69-75.
    - Separate local production verification from deployment: use `npm run build` to create `dist/`, then `npm run preview` to inspect the static Astro output locally.
    - Document that deployment is Cloudflare Worker-oriented in this repository, with Wrangler configuration in `wrangler.toml`; Cloudflare authentication/account access is required only for `npm run deploy` or `npm run deploy:staging` and is not required to run locally.
    - Do not imply that the deployment scripts target Vercel, Netlify, or GitHub Pages; static output may be adapted elsewhere, but those providers are not configured here.
  - Anchor: add a contributor checks section near the run/build instructions.
    - List `npm test`, `npm run lint`, and `npm run typecheck`, with concise descriptions matching `package.json:14-16`.
  - Anchor: `## 📁 Project Structure` at lines 23-37.
    - Remove the nonexistent `scripts/add-frontmatter.js` entry.
    - Make the concise tree reflect runtime-relevant paths: `src/content/docs/`, `src/pages/`, `src/data/`, `src/styles/`, `src/worker.ts`, `public/`, `scripts/sync-external-content.js`, `help-content-config.json`, `astro.config.mjs`, and `wrangler.toml`.
  - Anchor: `### External Content` at lines 62-67.
    - Reconcile this section with the new setup explanation, avoiding duplicate or contradictory instructions; retain the config-file pointer and clearly label sibling sources as optional.
  - Anchor: remaining headings and lists at lines 39-100.
    - Keep content-management/customization links that remain accurate, but remove stale “new migration” framing and decorative status claims where they distract from the current runbook. Keep the scope focused on operating and contributing to this documentation site.

## Commands

Use the exact guardrail commands from `.lastlight/issue-59/guardrails-report.md`:

```sh
npm test
npm run lint
npm run typecheck
```

The dependency installation command recorded by guardrails is:

```sh
npm ci
```

Also verify the documented production workflow with:

```sh
npm run build
```

## Implementation Approach

1. Rewrite the README opening as a current description of the Astro/Starlight documentation site rather than a newly migrated site.
2. Add explicit prerequisites and a clean-clone setup sequence using Node.js 22+, npm, Git, and `npm ci`.
3. Describe `npm run dev` and its default URL, then explain the external sync performed before the server starts.
4. Add a configuration section stating that local operation has no required environment variables or services, and distinguish optional sibling source repositories from required dependencies.
5. Document external sync diagnostics exactly as implemented: warn-and-skip missing sources/coverage and visibly surface per-source processing errors.
6. Add production build/preview and quality-check command sections that mirror the current `package.json` scripts verbatim.
7. Correct the project tree and Cloudflare Worker deployment section, including authentication requirements for deploy commands only.
8. Remove or tighten stale migration-era wording and verify all paths, repository names, scripts, and URLs against the checked-out files.
9. Run the guardrail commands and a production build; review the rendered Markdown structure and command snippets for copy/paste correctness.

## Risks and Edge Cases

- Optional sibling repositories are not available in a normal standalone clone. The README must not imply they are mandatory: missing configured source files and coverage are **warn-and-skip**, with the script’s warnings surfaced to the user; checked-in documentation remains available.
- A sibling source can exist but be unreadable or otherwise fail during processing. This is **warn-and-surface** behavior: the sync script emits an error for that slug and continues, and the README must make clear that the affected page was not refreshed rather than silently claiming success.
- Invalid `help-content-config.json` JSON fails before per-source processing. This is **warn-and-surface** as a command failure/stack trace, not a supported recoverable input; contributors should correct the config rather than expect a silent default.
- `npm run preview` previews the built static Astro site, while repository deployment wraps the assets with `src/worker.ts`. The README must avoid claiming that preview emulates Cloudflare Worker routing.
- Wrangler deploy commands require external Cloudflare credentials and suitable account permissions. Missing or invalid credentials must **warn-and-surface** through Wrangler’s command failure; no local fallback or silently skipped deployment should be documented.
- Other static hosts may be technically possible but have no checked-in provider configuration. Treat them as unsupported/adaptation-required and **warn-and-surface** that repository-specific routing/fallback behavior must be recreated, rather than presenting them as ready-to-run targets.
- The repository currently has pre-existing guardrail/tooling changes in `package.json` and `package-lock.json`. The executor must not modify, revert, or include those files as part of this README-only implementation.

## Test Strategy

- Run `npm test` to ensure the existing routing, generated-output, and registry tests remain green.
- Run `npm run lint` and `npm run typecheck` exactly as guardrails specify.
- Run `npm run build` to validate the documented sync/build path and confirm it produces `dist/`; inspect its visible missing-sibling warnings against the README explanation.
- Manually compare every documented npm command to `package.json`, every external repository/path claim to `help-content-config.json`, and deployment details to `wrangler.toml`.
- Review README Markdown rendering for ordered steps, fenced commands, links, and an accurate project tree. A long-running development server does not need to be committed as an automated test; if smoke-tested interactively, confirm it advertises `http://localhost:4321` and terminate it cleanly.

## Estimated Complexity

**Simple** — one documentation file, no runtime or test changes.
