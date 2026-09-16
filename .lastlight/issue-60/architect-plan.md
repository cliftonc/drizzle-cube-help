# Architect plan for #60

## Problem Statement

The root development dependency currently allows TypeScript 7 (`package.json:41`), while the installed guardrail tools declare incompatible peer ranges: `@astrojs/check` accepts TypeScript 5 or 6 (`package-lock.json:66-68`) and `typescript-eslint` accepts TypeScript below 6.1 (`package-lock.json:13918-13921`). The lockfile consequently installs TypeScript 7.0.2 (`package-lock.json:13854-13867`), causing ESLint to fail during parser initialization and `astro check` to crash before either check can inspect project code. The common supported range includes TypeScript 5; using the latest TypeScript 5 release restores both checks without weakening their configuration.

## Summary of what needs to change

Constrain the direct `typescript` development dependency to the TypeScript 5 release line, specifically `^5.9.3`, and regenerate the npm lockfile so clean installs resolve TypeScript 5.9.3 rather than 7.0.2. Do not alter ESLint rules, Astro configuration, check scripts, or source files: local verification with TypeScript 5.9.3 shows the existing lint and typecheck commands both pass unchanged.

## Files to modify

This implementation has one dependency-manifest/lockfile group; all members are listed below. No source, configuration, or test files should change.

- `package.json` — `devDependencies.typescript` at line 41: replace `^7.0.0` with `^5.9.3`. Keep the `lint` and `typecheck` script definitions unchanged.
- `package-lock.json` — root package metadata at `packages[""].devDependencies.typescript` (currently line 33) and resolved package entry `packages["node_modules/typescript"]` (currently beginning line 13854): regenerate with npm from the updated manifest so the root spec is `^5.9.3` and the resolved package is TypeScript 5.9.3 with npm-registry URL, integrity, binary, engine, and dependency metadata matching that release. The regenerated lockfile must remove TypeScript 7-only optional platform package entries/references rather than retaining stale `@typescript/typescript-*` artifacts.

## Commands

Use the exact repository commands recorded in `.lastlight/issue-60/guardrails-report.md`:

```bash
npm ci
npm run lint
npm run typecheck
npm test
```

## Implementation approach

1. Run the package-manager update for the direct dev dependency (for example, `npm install --save-dev typescript@^5.9.3`) so npm updates both `package.json` and `package-lock.json` consistently.
2. Inspect the diff and confirm it is limited to the two dependency files, the declared range is `^5.9.3`, the lockfile resolves `node_modules/typescript` to 5.9.3, and stale TypeScript 7 platform-package records are removed.
3. Run `npm ci` to prove a clean lockfile-based install succeeds and reproduces TypeScript 5.9.3.
4. Run the unchanged lint and Astro typecheck scripts. Fix any genuine diagnostics in the code if newly surfaced, but do not suppress rules, weaken tsconfig/ESLint configuration, or change scripts to bypass errors.
5. Run the complete Vitest suite to verify the compiler downgrade does not regress routing, generated output, worker behavior, or chart registry/data invariants.

## Risks and edge cases

- A broad TypeScript range could permit a future incompatible major. `^5.9.3` intentionally stays below 6.0 while accepting compatible TypeScript 5 patches, satisfying both current peer ranges.
- The lockfile currently contains TypeScript 7's platform-specific optional packages. Regenerating rather than hand-editing avoids stale or host-specific lock metadata; any lockfile/manifest mismatch must be **warn-and-surface** through a failing `npm ci`, never silently accepted.
- Future upgrades to Astro checking or `typescript-eslint` may change their supported TypeScript intersection. An unsatisfied peer dependency or guardrail startup failure must be **warn-and-surface** through npm/lint/typecheck output; do not silently select an unsupported compiler or skip a check.
- TypeScript 5.9 may report project diagnostics that TypeScript 7 did not reach because the current tooling crashes first. Such diagnostics must be **warn-and-surface** as normal `npm run typecheck` failures and repaired directly, not ignored or suppressed. Current local verification found none.
- There are no application runtime inputs or user data paths affected by this dependency-only change, so no runtime warn-and-skip behavior is needed. No unsupported input should be silently dropped.

## Test strategy

- Clean-install reproducibility: `npm ci` must pass using the regenerated lockfile.
- Lint regression: `npm run lint` must initialize `typescript-eslint`, inspect its existing target set, and exit successfully.
- Type-system regression: `npm run typecheck` must allow `astro check` to load `tsconfig.json`, complete diagnostics, and exit successfully.
- Functional regression: `npm test` must run all existing Vitest files—`src/worker.test.ts`, `src/data/chartDemoRegistry.test.ts`, and `src/lib/llms.test.ts`—without failures. A new unit test is not warranted because this repair is fully exercised by clean dependency installation and the two restored command-level guardrails.

## Estimated complexity

**Simple** — two dependency metadata files, no source or configuration changes.
