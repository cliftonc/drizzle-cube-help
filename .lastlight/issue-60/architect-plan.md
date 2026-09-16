# Architect plan for #60

## Problem Statement

The root development dependency selects TypeScript 7 (`package.json:41`), while the installed checking stack only accepts earlier compiler APIs: `@astrojs/check` declares TypeScript 5 or 6 (`package-lock.json:51-68`) and `typescript-eslint` requires TypeScript below 6.1 (`package-lock.json:13899-13921`). The lockfile consequently resolves TypeScript 7.0.2 and its native platform packages (`package-lock.json:13854-13887`), causing ESLint to reject the compiler and `astro check` to crash before either check can inspect project code.

## Summary of what needs to change

Pin the direct TypeScript development dependency to the latest mutually supported 6.0 patch, `6.0.3`, and regenerate the npm lockfile. This is a toolchain compatibility repair: it changes neither lint/typecheck configuration nor application behavior, and it preserves both checks at their existing strictness.

## Files to modify

The implementation manifest is exhaustive; no source, config, or test file should change.

- `package.json` — `devDependencies.typescript` at line 41: replace `^7.0.0` with exact version `6.0.3`. Use an exact pin rather than a caret because `typescript-eslint` 8.x currently caps support below TypeScript 6.1, and an install must not silently advance beyond the known compatible compiler API.
- `package-lock.json` — root `packages[""].devDependencies.typescript` at line 33 and package records anchored at `packages["node_modules/typescript"]` (currently lines 13854-13887): regenerate with npm so the root spec and resolved compiler are `6.0.3`, with npm-produced integrity, metadata, and dependency information. The TypeScript 7 native-platform record group is part of this lockfile update and must contain no stale entries: `node_modules/@typescript/typescript-aix-ppc64`, `node_modules/@typescript/typescript-darwin-arm64`, `node_modules/@typescript/typescript-darwin-x64`, `node_modules/@typescript/typescript-freebsd-arm64`, `node_modules/@typescript/typescript-freebsd-x64`, `node_modules/@typescript/typescript-linux-arm`, `node_modules/@typescript/typescript-linux-arm64`, `node_modules/@typescript/typescript-linux-loong64`, `node_modules/@typescript/typescript-linux-mips64el`, `node_modules/@typescript/typescript-linux-ppc64`, `node_modules/@typescript/typescript-linux-riscv64`, `node_modules/@typescript/typescript-linux-s390x`, `node_modules/@typescript/typescript-linux-x64`, `node_modules/@typescript/typescript-netbsd-arm64`, `node_modules/@typescript/typescript-netbsd-x64`, `node_modules/@typescript/typescript-openbsd-arm64`, `node_modules/@typescript/typescript-openbsd-x64`, `node_modules/@typescript/typescript-sunos-x64`, `node_modules/@typescript/typescript-win32-arm64`, and `node_modules/@typescript/typescript-win32-x64`. Let npm remove/update this complete group according to the TypeScript 6 package metadata; do not hand-edit generated integrity data.

Existing tests to run, but not modify, are the complete `src/**/*.test.ts` set: `src/worker.test.ts`, `src/data/chartDemoRegistry.test.ts`, and `src/lib/llms.test.ts`.

## Commands

Copied from `.lastlight/issue-60/guardrails-report.md`:

```bash
npm ci
npm test
npm run lint
npm run typecheck
```

## Implementation approach

1. Update `devDependencies.typescript` to the exact `6.0.3` release, which lies in the intersection of `@astrojs/check`'s `^5.0.0 || ^6.0.0` peer range and `typescript-eslint`'s `>=4.8.4 <6.1.0` peer range.
2. Regenerate `package-lock.json` through npm (for example, `npm install --save-dev --save-exact typescript@6.0.3`) so the manifest and lockfile remain internally consistent and TypeScript 7 platform artifacts are removed by the package manager.
3. Run `npm ci` to prove a clean, lockfile-driven installation succeeds without peer incompatibility warnings/errors.
4. Run the existing full Vitest suite, lint command, and Astro typecheck command exactly as listed above. Fix genuine diagnostics in implementation files if TypeScript 6 exposes any, rather than suppressing or weakening a check; any such extra file would first require an architecture-plan update because it is not currently expected.
5. Inspect the final diff to ensure it contains only the dependency declaration and npm-generated lockfile changes and that no generated coverage content was touched.

## Risks and edge cases

- Future TypeScript releases at or above 6.1 are not fully supported by the currently locked `typescript-eslint` range. The exact pin prevents silently selecting them; a requested compiler upgrade must **warn-and-surface** an npm peer-dependency conflict and require an explicit coordinated tooling upgrade rather than being skipped or forced.
- TypeScript 7 is not supported by the current Astro checker or lint parser. Attempts to reintroduce it must **warn-and-surface** through npm peer validation and failed lint/typecheck gates; do not use `--force`, legacy peer handling, or warning suppression.
- Lockfile generation can vary with npm versions or registry resolution. If npm cannot resolve 6.0.3 or reports integrity/peer errors, **warn-and-surface** the install failure and stop; do not retain stale TypeScript 7 records, hand-author integrity fields, or silently fall back to another compiler.
- A compiler downgrade can reveal legitimate project diagnostics after the startup crashes are removed. These must be **warn-and-surface** through the unchanged commands and then corrected in source under a revised manifest, never silently skipped with exclusions, disabled rules, or broad suppressions.
- Platform-specific TypeScript 7 optional packages are unsupported by the TypeScript 6 package shape. Their removal must be explicit in the generated lockfile; npm installation errors on any supported host must **warn-and-surface**, not fall back silently to an unpinned/global compiler.

## Test strategy

- `npm ci` validates that `package.json` and `package-lock.json` agree and that the compatible compiler can be installed cleanly.
- `npm test` runs all three existing Vitest files (`src/worker.test.ts`, `src/data/chartDemoRegistry.test.ts`, and `src/lib/llms.test.ts`) to catch regressions despite the dependency-only scope.
- `npm run lint` proves `typescript-eslint` can load TypeScript 6 and complete its configured source/test analysis.
- `npm run typecheck` proves `astro check` can load the tsconfig and complete semantic checking rather than crashing in the language-server API.
- Confirm the command output represents actual analyzed files/tests and that no check configuration, source exclusion, test skip, or suppression was introduced.

## Estimated complexity

simple
