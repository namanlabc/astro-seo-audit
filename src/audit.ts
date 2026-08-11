import { access } from "node:fs/promises";
import path from "node:path";
import { discoverProject } from "./astro/discovery.js";
import { discoverSourceHints, normalizeSourceHintRoute } from "./astro/source-hints.js";
import { mergeConfig } from "./config/defaults.js";
import { loadUserConfig } from "./config/load.js";
import { discoverPage, discoverPages } from "./crawler/discover.js";
import { pageRules } from "./rules/page/index.js";
import { siteRules } from "./rules/site/index.js";
import { calculateScore } from "./scoring/calculate.js";
import { compareWithBaseline } from "./baseline.js";
import type {
  AuditContext,
  AuditOptions,
  AuditReport,
  Finding,
  PageResult,
} from "./types/index.js";

export const VERSION = "0.3.3";

export async function audit(options: AuditOptions = {}): Promise<AuditReport> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const discovered = await discoverProject(cwd, options.dir);
  const fileConfig = await loadUserConfig(discovered.projectRoot);
  const merged = mergeConfig(
    {
      site: discovered.site,
      trailingSlash: discovered.trailingSlash,
      buildDir: path.relative(discovered.projectRoot, discovered.buildDir) || ".",
    },
    fileConfig,
    options.config,
  );
  const buildDir = options.dir
    ? path.resolve(cwd, options.dir)
    : path.resolve(discovered.projectRoot, merged.buildDir);
  const config = { ...merged, buildDir };

  await assertDirectory(buildDir);
  const mode = options.page ? "page" : "site";
  const pages = options.page
    ? [await discoverPage(buildDir, config, options.page)]
    : await discoverPages(buildDir, config);
  if (pages.length === 0) {
    throw new Error(
      `Audit not started: no generated HTML was found in ${buildDir}. This usually means the site has not been built yet or the previous Astro build failed. Run "npm run build" and confirm it finishes successfully before running Astro SEO Audit again.`,
    );
  }

  const context: AuditContext = { pages, config, buildDir };
  const sourceHints = discovered.astroDetected
    ? await discoverSourceHints(discovered.projectRoot)
    : new Map<string, string>();
  const pageResults: PageResult[] = [];
  let pageChecksRun = 0;
  let passedChecks = 0;

  for (const page of pages) {
    const findings: Finding[] = [];
    const passedRules: string[] = [];
    for (const rule of pageRules) {
      if (config.ignoredRules.includes(rule.meta.id)) continue;
      pageChecksRun += 1;
      const result = rule.evaluate(page, context);
      if (result.length === 0) {
        passedRules.push(rule.meta.id);
        passedChecks += 1;
      } else {
        findings.push(...result);
      }
    }
    pageResults.push({
      path: page.route,
      url: page.url,
      file: page.relativeFilePath,
      source: sourceHints.get(normalizeSourceHintRoute(page.route)),
      kind: page.kind,
      indexable: page.indexable,
      score: calculateScore(findings).score,
      findings,
      passedRules,
      schemaTypes: [...new Set(page.schemas.flatMap((schema) => schema.types))],
    });
  }

  const siteFindings: Finding[] = [];
  const sitePassedRules: string[] = [];
  let siteChecksRun = 0;
  if (mode === "site") {
    for (const rule of siteRules) {
      if (config.ignoredRules.includes(rule.meta.id)) continue;
      siteChecksRun += 1;
      const result = await rule.evaluate(context);
      if (result.length === 0) {
        passedChecks += 1;
        sitePassedRules.push(rule.meta.id);
      } else siteFindings.push(...result);
    }
  }

  for (const page of pageResults) {
    const relatedSiteFindings = siteFindings.filter(
      (finding) => finding.path === page.path || finding.relatedPaths?.includes(page.path),
    );
    page.score = calculateScore([...page.findings, ...relatedSiteFindings]).score;
  }

  const findings = [...pageResults.flatMap((page) => page.findings), ...siteFindings];
  const summary = {
    errors: findings.filter((item) => item.severity === "error").length,
    warnings: findings.filter((item) => item.severity === "warning").length,
    info: findings.filter((item) => item.severity === "info").length,
    passedChecks,
    checksRun: pageChecksRun + siteChecksRun,
  };
  const scored = calculateScore(findings);

  const report: AuditReport = {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    mode,
    requestedPage: options.page,
    project: {
      ...discovered,
      buildDir,
      site: config.site,
      trailingSlash: config.trailingSlash,
    },
    failOn: config.failOn,
    score: scored.score,
    scoreBreakdown: scored.breakdown,
    pagesScanned: pages.length,
    summary,
    pages: pageResults,
    siteFindings,
    sitePassedRules,
    findings,
  };
  if (options.baseline) {
    report.baseline = await compareWithBaseline(report, cwd, options.baseline);
  }
  return report;
}

async function assertDirectory(directory: string): Promise<void> {
  try {
    await access(directory);
  } catch {
    throw new Error(
      `Audit not started: build directory not found at ${directory}. Run "npm run build" and confirm it finishes successfully, or pass the generated directory with --dir.`,
    );
  }
}
