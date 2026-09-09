# Contributing to Astro SEO Audit

Thanks for helping make generated Astro sites easier to audit without adding SEO noise.

## Local setup

Use Node.js 20 or newer:

```bash
npm install
npm run check
```

Useful commands:

```bash
npm test          # complete test suite
npm run lint      # strict TypeScript check
npm run format    # format source and docs
npm run build     # ESM, declarations, source maps, and CLI
```

Audit the included healthy fixture after building:

```bash
node dist/cli/index.js tests/fixtures/healthy/dist
```

## Adding a rule

1. Choose page or site scope.
2. Add a focused `PageRule` or `SiteRule` under `src/rules/page` or `src/rules/site`.
3. Give it stable metadata: `id`, `name`, `category`, `defaultSeverity`, `description`, `help`, and `scope`.
4. Return structured findings through the shared `finding()` helper.
5. Export it from the relevant rule index.
6. Add real HTML/output fixtures and tests for both positive and negative cases.
7. Document the check if it changes the public checklist.

Rule IDs use a dotted namespace, such as `canonical.missing` or `links.broken-internal`. Avoid combining unrelated conditions in one evaluator.

## SEO correctness

- Reserve errors for high-confidence technical problems.
- Use warnings for actionable concerns whose intent is uncertain.
- Use info for editorial or social recommendations.
- Do not turn character ranges, metadata preferences, or disputed SEO claims into hard requirements.
- Prefer silence to a noisy false positive.
- Explain the rationale and a practical resolution in rule help text.

## Code conventions

- Strict TypeScript; avoid `any`.
- Small modules and named domain types.
- Core audit code must not call `process.exit()`.
- Do not execute user configuration to make discovery easier.
- Keep dependencies lean and local-first; no telemetry or remote content upload.
- Preserve deterministic results and machine-readable JSON.

## Pull requests

Keep each pull request focused. Describe the behavior, explain SEO assumptions, list tests, and include fixture changes. Run `npm run check` before submitting.

Documentation-only changes do not need fixture updates. Code changes that alter findings, scoring, CLI output, or generated reports should include focused regression coverage for the changed behavior.

By contributing, you agree that your contribution is licensed under the MIT License.
