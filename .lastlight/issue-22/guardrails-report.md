Test Framework:
- Found no test runner script in package.json. Some example test snippets in docs import vitest, but there is no vitest dependency or test script.

Linting:
- No linter configured in package.json. Docs reference ESLint in examples, but no ESLint dependency or scripts found.

Type Checking:
- tsconfig.json exists (extends astro/tsconfigs/strict). No typecheck script (tsc) in package.json, but TypeScript config is present.

CI Pipeline:
- .github/workflows/ not present in repository.

Conclusion: Blocking issue: no test framework configured and no test script; tests in docs are not runnable as-is.
