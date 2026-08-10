# Astro SEO Audit

**Catch SEO problems in Astro before you deploy.**

> **Independent project:** Astro SEO Audit is not affiliated with, endorsed by, or an official project of Astro or its maintainers.

Astro SEO Audit scans the HTML your Astro site actually generates and detects technical and on-page SEO issues across your whole site.

It does not replace your SEO components, layouts, Content Collections, MDX, or schema helpers. Use whatever SEO implementation you prefer; Astro SEO Audit inspects what gets shipped to search engines.

```text
Astro SEO Audit
────────────────────────────────────────────────

47 pages scanned
Astro SEO Audit health score: 87/100

✕ Errors       3
⚠ Warnings     14
ⓘ Notices      8
✓ Checks passed 328

Top issues

✕ links.broken-internal
  /food-wheel/ → /foods/

⚠ canonical.missing /wheel-of-doom/
  Indexable page has no canonical link.
```

## Why this exists

Source-code SEO linters only see one implementation. Astro sites can generate metadata through layouts, integrations, Markdown, MDX, content loaders, or plain HTML. The final document is the shared truth.

Astro SEO Audit combines:

- final-output HTML inspection;
- site-wide crawling and internal-link graph analysis;
- conservative, rationale-backed SEO rules;
- terminal and JSON reports; and
- deterministic CI quality gates.

It runs locally. There is no telemetry, analytics, content upload, or AI API.

## Requirements

- Node.js 20 or newer
- an Astro static build (normally `dist/`)

## Installation

```bash
npm install --save-dev astro-seo-audit
```

## Quick start

Build your Astro project, then run the audit:

```bash
npm run build
npx astro-seo-audit
```

Astro SEO Audit detects a common Astro configuration, including literal `site`, `trailingSlash`, and `outDir` values. Astro config files are read statically and are never imported or executed.

Audit an explicit build directory:

```bash
npx astro-seo-audit ./dist
# equivalent
npx astro-seo-audit --dir ./dist
```

See every option:

```bash
npx astro-seo-audit --help
```

## CLI

```text
astro-seo-audit [directory] [options]

--dir <path>          Audit a specific build directory
--format <format>     terminal or json
--output <file>       Write a structured JSON report
--fail-on <severity>  error, warning, info, or none
--no-color            Disable ANSI colors
--quiet, -q           Print only the summary
--version, -v         Show the package version
--help, -h            Show help
```

`NO_COLOR` is respected automatically. Output is non-interactive and safe for CI logs.

## CI quality gates

Fail only when technical errors exist:

```yaml
- name: Build
  run: npm run build
- name: Audit generated SEO
  run: npx astro-seo-audit --fail-on error
```

Threshold behavior is inclusive:

| Value     | Non-zero exit when findings include |
| --------- | ----------------------------------- |
| `error`   | errors                              |
| `warning` | warnings or errors                  |
| `info`    | any finding                         |
| `none`    | never because of findings           |

Exit code `1` means the configured quality gate failed. Exit code `2` means the audit could not run, such as a missing build directory or invalid option.

## JSON output

Print JSON:

```bash
npx astro-seo-audit --format json
```

Write it to a file:

```bash
npx astro-seo-audit --output seo-report.json
```

The JSON is a machine-readable model rather than terminal text. It includes project discovery, the score breakdown, summary counts, normalized page results, passed rule IDs, schema types, page findings, site findings, site-wide passed rules, and a flat findings array.

```json
{
  "version": "0.1.1",
  "score": 87,
  "scoreBreakdown": {
    "initial": 100,
    "penalty": 13,
    "weights": { "error": 8, "warning": 2, "info": 0.25 },
    "rulePenaltyCap": 12,
    "penaltiesByRule": {}
  },
  "pagesScanned": 47,
  "summary": {},
  "pages": [],
  "siteFindings": [],
  "findings": []
}
```

## Checks in v0.1

Each check is an independent rule with an ID, category, default severity, scope, description, help text, and evaluation function.

| Area             | Checks                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Title            | missing, empty, multiple, duplicate, configurable editorial length                                                   |
| Meta description | missing, empty, multiple, duplicate, configurable editorial length                                                   |
| Canonical        | missing, empty, multiple, relative, malformed, confident same-origin mismatch, duplicate target                      |
| Indexability     | noindex notice, nofollow notice, contradictory page directives                                                       |
| Headings         | missing H1, multiple H1 notice; full hierarchy is collected                                                          |
| Images           | missing `alt`; valid decorative `alt=""` is not flagged                                                              |
| Internal links   | malformed links, missing generated targets, orphan indexable pages                                                   |
| Social           | missing Open Graph fields and `twitter:card`, all at notice level                                                    |
| Language         | missing, empty, or obviously malformed `html[lang]`                                                                  |
| JSON-LD          | empty blocks, invalid JSON, detected `@type` values including `@graph`                                               |
| Sitemap          | absence, malformed XML/URLs, indexable generated pages missing from sitemap; generated sitemap indexes are supported |
| robots.txt       | absence, exact contradictory directives, wildcard full-site block                                                    |

The rules are deliberately conservative:

- title and description ranges are guidance, not Google limits;
- meta descriptions, Open Graph data, schema, sitemaps, and robots.txt are not required for indexing;
- multiple H1 elements are not treated as a technical error;
- `noindex` is a notice because intent cannot be inferred reliably;
- empty image alt text is accepted as a valid decorative-image pattern; and
- JSON-LD parsing does not claim rich-result eligibility.

## Configuration

Zero configuration works for typical static Astro builds. Optional settings can live in `astro-seo-audit.config.json`:

```json
{
  "site": "https://example.com",
  "buildDir": "dist",
  "trailingSlash": "always",
  "ignoreRoutes": ["/drafts/**", "/404.html"],
  "orphanExclusions": ["/campaign/**"],
  "ignoredRules": ["twitter.card-missing"],
  "severityOverrides": {
    "description.missing": "info"
  },
  "titleLength": { "min": 25, "max": 65 },
  "descriptionLength": { "min": 60, "max": 170 },
  "failOn": "error"
}
```

The same object may be placed under the `astro-seo-audit` key in `package.json`. A standalone JSON file takes precedence. CLI options override file configuration.

JSON is intentional in v0.1: loading JavaScript or TypeScript configuration would execute project code. Static Astro discovery also recognizes only common literal values. Pass `--dir` or set JSON configuration when a computed Astro setting cannot be inferred safely.

Route patterns support `*` within one path segment and `**` across segments.

## Health score

The score is an **Astro SEO Audit health score**, not a Google ranking or Lighthouse score.

It starts at 100. Default penalties are:

- error: 8 points;
- warning: 2 points; and
- info: 0.25 points.

Repeated findings from one rule are capped at 12 points. This prevents hundreds of minor repetitions from overwhelming the result. The final score is rounded to the nearest integer and never falls below zero. JSON output exposes every weight and per-rule penalty so score changes are explainable.

Severity overrides affect both reporting and scoring.

## Programmatic API

The CLI is the primary interface, but the core is exported for tooling:

```ts
import { audit, renderJson } from "astro-seo-audit";

const report = await audit({ dir: "./dist" });
console.log(renderJson(report));
```

Built-in `pageRules` and `siteRules` are exported for inspection and future composition. The engine is not coupled to Astro internals; only project discovery is Astro-specific.

## Architecture

```text
Astro project discovery
        ↓
Generated HTML crawler → normalized page model → page rules
                                      ↓
                             link/site model → site rules
                                      ↓
                          scoring → terminal / JSON
```

The core audits generated files. It does not require `astro-seo`, a particular layout, Content Collections, or any head component.

## Limitations

- v0.1 audits static generated HTML, not server-rendered routes that have no build-time HTML file.
- External links are not requested or validated.
- Astro config detection is intentionally static and cannot evaluate variables, environment branches, or helper functions.
- robots.txt support covers safe, high-confidence basics rather than every crawler-specific matching edge case.
- Sitemap indexes are followed through generated local `sitemap*.xml` files; remote child sitemaps are not downloaded.
- JSON-LD is parsed and typed, not validated against Schema.org or Google Rich Results requirements.
- Redirects, hreflang, pagination, and HTTP headers are outside v0.1.

## Roadmap

Potential future work includes a custom rule API, safe `--fix` operations, SARIF and GitHub annotations, historical comparisons, richer schema and hreflang validation, redirect analysis, external-link checking, and framework adapters. These are not placeholder features in v0.1.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md), especially the small rule contract for adding checks.

## License

[MIT](LICENSE). Astro SEO Audit is an independent community project and is not an official Astro or Yoast package.
