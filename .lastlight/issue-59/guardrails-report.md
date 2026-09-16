# Guardrails report for #59

Status: **GATE_PENDING**

## Dependency installation

- Command: `npm ci`
- Result: passed (exit 0).
- Package manager selected from `package-lock.json`.

## Test framework

- Vitest is configured through the `test` package script.
- Test files exist under `src/**/*.test.ts`.
- Full-suite command: `npm test`
- Not run during pre-flight, as required.
- `.git/lastlight-gate.sh` contains the exact full-suite command for the harness.

## Linting

- Configured command: `npm run lint`
- Result: passed (exit 0).

## Type checking

- Configured command: `npm run typecheck`
- Result: passed (exit 0).

## CI pipeline

- No `.github/workflows/` directory or workflow configuration was found.

## Full test suite gate (run by the harness)

- Verdict: READY — full test suite passed (exit 0) in 1s
- Command (`.git/lastlight-gate.sh`):
```sh
#!/usr/bin/env bash
set -euo pipefail
npm test
```
- Exit code: 0 · duration: 1s · limit: gate.timeoutSeconds=900s

Last 60 lines of output:
```
npm warn Unknown env config "store-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.

> drizzle-cube-help-site-starlight@0.0.1 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/agent/workspace/drizzle-cube-help[39m

 [32m✓[39m src/lib/llms.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/worker.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/data/chartDemoRegistry.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m      Tests [22m [1m[32m11 passed[39m[22m[90m (11)[39m
[2m   Start at [22m 10:37:19
[2m   Duration [22m 198ms[2m (transform 86ms, setup 0ms, import 133ms, tests 25ms, environment 0ms)[22m

```
