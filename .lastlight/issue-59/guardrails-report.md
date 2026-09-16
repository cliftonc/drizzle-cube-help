# Guardrails report for issue #59

## Result

**BLOCKED** — dependency installation succeeded, but both configured static checks fail with the installed TypeScript 7 toolchain. The tooling repair is tracked in #61.

## Dependency installation

- Command: `npm ci`
- Status: passed (exit 0)
- Package manager selected from `package-lock.json`.

## Test framework

- Vitest is configured in `vitest.config.ts` and test files are present under `src/`.
- Full-suite command: `npm test`
- Status: identified but not run during pre-flight, as required.

## Linting

- ESLint is configured in `eslint.config.js`.
- Command: `npm run lint`
- Status: failed (exit 2).
- Diagnostic: `typescript-eslint` rejects TypeScript 7.0 during startup, before linting files.

## Type checking

- Astro Check and TypeScript are configured (`astro check`, `tsconfig.json`).
- Command: `npm run typecheck`
- Status: failed (exit 1).
- Diagnostic: Astro's language server crashes while loading the TypeScript configuration with `Cannot read properties of undefined (reading 'fileExists')`.

## CI pipeline

- No `.github/workflows/` files are present.

## Gate script

No `.git/lastlight-gate.sh` was created because pre-flight checks failed. If the static-check failures are repaired, the test-only gate command should be:

```sh
npm test
```
