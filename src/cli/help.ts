export const helpText = `Astro SEO Audit

Catch SEO problems in Astro before you deploy.

Usage:
  astro-seo-audit [directory] [options]

Options:
  --dir <path>          Audit a specific build directory (default: detected outDir or dist)
  --page <route>        Audit one generated page without running site-wide checks
  --format <format>     Output format: terminal or json (default: terminal)
  --output <file>       Write structured JSON to a file
  --fail-on <severity>  Exit non-zero for: error, warning, info, or none
  --no-color            Disable ANSI colors
  --quiet, -q           Print only the summary
  --version, -v         Show the package version
  --help, -h            Show this help

Examples:
  astro-seo-audit
  astro-seo-audit ./dist
  astro-seo-audit --page /blog/new-post/
  astro-seo-audit --format json
  astro-seo-audit --output seo-report.json --fail-on error
`;
