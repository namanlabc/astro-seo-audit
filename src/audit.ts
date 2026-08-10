import { access } from "node:fs/promises";
import path from "node:path";
import { discoverProject } from "./astro/discovery.js";
import { mergeConfig } from "./config/defaults.js";
import { loadUserConfig } from "./config/load.js";
import { discoverPages } from "./crawler/discover.js";
import { pageRules } from "./rules/page/index.js";
import { siteRules } from "./rules/site/index.js";
import { calculateScore } from "./scoring/calculate.js";
import type {
  AuditContext,
  AuditOptions,
  AuditReport,
  Finding,
  PageResult,
} from "./types/index.js";

export const VERSION = "0.1.2";

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
  const pages = await discoverPages(buildDir, config);
  if (pages.length === 0) {
    throw new Error(
      `No generated HTML files were found in ${buildDir}. Build the Astro site first.`,
    );
  }

  const context: AuditContext = { pages, config, buildDir };
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
      kind: page.kind,
      indexable: page.indexable,
      findings,
      passedRules,
      schemaTypes: [...new Set(page.schemas.flatMap((schema) => schema.types))],
    });
  }

  const siteFindings: Finding[] = [];
  const sitePassedRules: string[] = [];
  let siteChecksRun = 0;
  for (const rule of siteRules) {
    if (config.ignoredRules.includes(rule.meta.id)) continue;
    siteChecksRun += 1;
    const result = await rule.evaluate(context);
    if (result.length === 0) {
      passedChecks += 1;
      sitePassedRules.push(rule.meta.id);
    } else siteFindings.push(...result);
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

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
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
}

async function assertDirectory(directory: string): Promise<void> {
  try {
    await access(directory);
  } catch {
    throw new Error(`Build directory not found: ${directory}. Run astro build or pass --dir.`);
  }
}
