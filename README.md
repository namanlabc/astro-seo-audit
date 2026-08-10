# Astro SEO Audit

[![npm version](https://img.shields.io/npm/v/astro-seo-audit.svg)](https://www.npmjs.com/package/astro-seo-audit)
[![weekly downloads](https://img.shields.io/npm/dw/astro-seo-audit.svg)](https://www.npmjs.com/package/astro-seo-audit)
[![CI](https://github.com/namanlabc/astro-seo-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/namanlabc/astro-seo-audit/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/astro-seo-audit.svg)](LICENSE)

**SEO checks that fit the way Astro ships.**

> **Independent project:** Astro SEO Audit is not affiliated with, endorsed by, or an official project of Astro or its maintainers.

Astro SEO Audit inspects the HTML your Astro site actually generates, gives it an explainable 0–100 health score, and catches technical and on-page SEO problems before they reach production.

Audit the whole site before a deploy or check one new page while you are writing it. Add a baseline to block only new regressions, then send the results to your terminal, an HTML report, JSON, or GitHub Code Scanning through SARIF.

**Nothing to host. No browser. No native binary. No telemetry.**

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

## Why use it

Astro sites can generate metadata through layouts, integrations, Markdown, MDX, content loaders, or plain HTML. Source-code checks see only one implementation; Astro SEO Audit checks the final document delivered to search engines.

| Need                                | What Astro SEO Audit does                                                |
| ----------------------------------- | ------------------------------------------------------------------------ |
| Check a site before deployment      | Audits every generated page and the internal-link graph after the build  |
| Check only a new or updated page    | Runs a fast route-level audit with its own 0–100 score                   |
| Adopt checks on an established site | Baselines existing findings and fails only on newly introduced problems  |
| Understand what changed             | Explains every finding, penalty, severity, and likely static source file |
| Use results outside the terminal    | Produces JSON, standalone HTML, and SARIF 2.1 reports                    |

Under the hood, it combines:

- final-output HTML inspection;
- automatic auditing after `astro build` through a native Astro integration;
- site-wide crawling and internal-link graph analysis;
- conservative, rationale-backed SEO rules;
- explainable 0–100 scoring and fast page-only audits;
- terminal, JSON, standalone HTML, and SARIF reports;
- adoption baselines that block only newly introduced regressions;
- likely `src/pages` source-file hints for static routes;
- deterministic CI quality gates.

It runs locally. There is no telemetry, analytics, content upload, or AI API.

## Requirements

- Node.js 20 or newer
- an Astro static build (normally `dist/`)

## Installation

Let Astro install the package and update your configuration:

```bash
npx astro add astro-seo-audit
```

Or install it manually:

```bash
npm install --save-dev astro-seo-audit
```

## Quick start: audit every build

Run the audit automatically at the end of every Astro build:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import seoAudit from "astro-seo-audit";

export default defineConfig({
  site: "https://example.com",
  integrations: [seoAudit()],
});
```

The integration audits Astro's resolved output directory, including custom `outDir` settings. It adds no client-side JavaScript and does not affect the generated site.

Prefer an on-demand audit? Build the site and run the CLI without changing `astro.config.mjs`:

```bash
npm run build
npx astro-seo-audit
```

Use it as a production quality gate and write a visual report:

```js
seoAudit({
  failOn: "error",
  output: "reports/astro-seo-audit.html",
});
```

Set `SKIP_ASTRO_SEO_AUDIT=1` for a build that intentionally needs to skip the audit. The CLI remains available for ad-hoc, single-page, and CI usage.

Astro SEO Audit detects a common Astro configuration, including literal `site`, `trailingSlash`, and `outDir` values. Astro config files are read statically and are never imported or executed.

Audit an explicit build directory:

```bash
npx astro-seo-audit ./dist
# equivalent
npx astro-seo-audit --dir ./dist
```

Audit only a newly generated page:

```bash
npx astro-seo-audit --page /blog/new-post/
```

Page mode resolves that route directly to its generated HTML file and reads only that page. It runs every page-level check while skipping site-wide checks that would require crawling the complete build, such as duplicate metadata, broken-link graphs, orphan pages, sitemaps, and robots.txt. This makes it suitable for a fast pre-publish check; keep the default full-site audit in CI for complete coverage.

See every option:

```bash
npx astro-seo-audit --help
```

## CLI

```text
astro-seo-audit [directory] [options]

--dir <path>          Audit a specific build directory
--page <route>        Audit one generated page and skip site-wide checks
--format <format>     terminal, json, or html
--output <file>       Write a report; .html selects HTML automatically
--baseline <file>     Report and fail only on findings absent from a baseline
--write-baseline <file>  Save current findings as an adoption baseline
--fail-on <severity>  error, warning, info, or none
--no-color            Disable ANSI colors
--quiet, -q           Print only the summary
--version, -v         Show the package version
--help, -h            Show help
```

`NO_COLOR` is respected automatically. Output is non-interactive and safe for CI logs.

`--page` accepts a generated route or a same-origin absolute URL. Query strings and fragments are ignored when locating the file:

```bash
npx astro-seo-audit --page /guides/getting-started/
npx astro-seo-audit --page https://example.com/guides/getting-started/
npx astro-seo-audit --dir ./custom-output --page /launch/
```

The site must be built first. Both Astro directory output (`/about/` → `about/index.html`) and file output (`/about.html`) are supported.

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

### Adopt it without fixing everything first

Create a baseline from the current site:

```bash
npx astro-seo-audit --write-baseline .astro-seo-audit-baseline.json
```

Commit that file, then block only newly introduced warnings or errors:

```bash
npx astro-seo-audit \
  --baseline .astro-seo-audit-baseline.json \
  --fail-on warning
```

The health score continues to describe the complete site. The baseline changes only which findings are displayed and used by the CI quality gate, so existing debt is never mistaken for a healthy score.

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
  "version": "0.3.1",
  "mode": "site",
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

## HTML report

Generate a standalone report that can be opened locally or uploaded as a CI artifact:

```bash
npx astro-seo-audit --output astro-seo-report.html
```

The responsive report includes the health score, severity totals, actionable findings, evidence, help text, and a page-by-page summary. It has no remote assets or scripts and does not upload site content.

## GitHub annotations with SARIF

Generate a SARIF 2.1 report for GitHub Code Scanning and other compatible CI systems:

```bash
npx astro-seo-audit --output astro-seo-audit.sarif
```

Static routes are linked to their likely `src/pages` source file when one can be determined safely. Dynamic and generated routes fall back to their built HTML file rather than guessing.

## Built-in checks

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
- generated `404.html` documents are recognized as not-found pages and excluded from indexability-dependent canonical, orphan, duplicate, and sitemap checks; and
- JSON-LD parsing does not claim rich-result eligibility.

## Configuration

Zero configuration works for typical static Astro builds. Optional settings can live in `astro-seo-audit.config.json`:

```json
{
  "site": "https://example.com",
  "buildDir": "dist",
  "trailingSlash": "always",
  "ignoreRoutes": ["/drafts/**"],
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

JSON configuration is intentional: loading JavaScript or TypeScript configuration would execute project code. Static Astro discovery also recognizes only common literal values. Pass `--dir` or set JSON configuration when a computed Astro setting cannot be inferred safely.

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

For a fast page-only audit:

```ts
const report = await audit({
  dir: "./dist",
  page: "/blog/new-post/",
});
```

Built-in `pageRules` and `siteRules` are exported for inspection and future composition. The engine is not coupled to Astro internals; only project discovery is Astro-specific.

## Architecture

```text
Astro integration or CLI
        ↓
Astro project discovery → generated HTML crawler → normalized page model → page rules
                                                              ↓
                                                     link/site model → site rules
                                                              ↓
                                  scoring → terminal / JSON / HTML → baseline gate
```

The core audits generated files. It does not require `astro-seo`, a particular layout, Content Collections, or any head component.

## Limitations

- The auditor inspects static generated HTML, not server-rendered routes that have no build-time HTML file.
- Page mode intentionally skips site-wide rules. Duplicate metadata, internal-link graph, orphan, sitemap, and robots.txt checks require a full audit.
- External links are not requested or validated.
- Astro config detection is intentionally static and cannot evaluate variables, environment branches, or helper functions.
- robots.txt support covers safe, high-confidence basics rather than every crawler-specific matching edge case.
- Sitemap indexes are followed through generated local `sitemap*.xml` files; remote child sitemaps are not downloaded.
- JSON-LD is parsed and typed, not validated against Schema.org or Google Rich Results requirements.
- Redirects, hreflang, pagination, and HTTP headers are outside v0.1.

## Roadmap

Potential future work includes a custom rule API, safe `--fix` operations, richer schema and hreflang validation, redirect analysis, external-link checking, and framework adapters.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md), especially the small rule contract for adding checks.

## License

[MIT](LICENSE). Astro SEO Audit is an independent community project and is not an official Astro package.
