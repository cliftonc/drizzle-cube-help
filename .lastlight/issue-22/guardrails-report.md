BOOTSTRAP BUILD — repository is missing key developer tooling required by the guardrails check.

The issue #22 requests adding basic guardrails (linting, vitest test harness, AGENTS.md). This means the missing tooling is the expected starting state and should be bootstrapped by the executor.

Detected status:
- Test Framework: MISSING. package.json has no test script and no test runner dependency (docs reference vitest in examples, but no vitest dependency).
- Linting: MISSING. No ESLint (or other linter) dependency or lint script found in package.json.
- Type Checking: PARTIAL. tsconfig.json exists but there is no "typecheck"/tsc script in package.json.
- CI Pipeline: MISSING. No .github/workflows/ directory found.

Action for executor:
- Install and configure a test runner (suggest vitest) and add a basic test script and example test(s) for critical functions.
- Install and configure a linter (suggest ESLint) and add a lint script targeting critical files.
- Add a typecheck script (tsc --noEmit or similar) if TypeScript is used in the repo.
- Optionally add a basic GitHub Actions workflow that runs lint/test/typecheck.

Because the issue explicitly requests adding the tooling, mark this as a BOOTSTRAP build and proceed. The executor must establish these tools as part of the implementation.
