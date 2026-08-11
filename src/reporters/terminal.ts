import pc from "picocolors";
import { pageRules } from "../rules/page/index.js";
import type { AuditReport, Finding, PageResult, Severity } from "../types/index.js";

export interface TerminalReporterOptions {
  color?: boolean;
  quiet?: boolean;
  maxIssues?: number;
  maxPages?: number;
}

const pageRuleMetadata = new Map(pageRules.map((rule) => [rule.meta.id, rule.meta]));

export function renderTerminal(report: AuditReport, options: TerminalReporterOptions = {}): string {
  const enabled = options.color ?? true;
  const color = (fn: (value: string) => string, value: string): string =>
    enabled ? fn(value) : value;
  const heading = (value: string): string => color(pc.bold, value);
  const dim = (value: string): string => color(pc.dim, value);
  const severity = (value: Severity, text: string): string => {
    const fn = value === "error" ? pc.red : value === "warning" ? pc.yellow : pc.cyan;
    return color(fn, text);
  };
  const lines: string[] = [];

  lines.push(heading("Astro SEO Audit"));
  lines.push(dim("─".repeat(48)));
  lines.push("");
  lines.push(`${report.pagesScanned} page${report.pagesScanned === 1 ? "" : "s"} scanned`);
  if (report.mode === "page") {
    lines.push(dim("Page-only audit. Site-wide checks were skipped."));
  }
  lines.push(
    `${report.mode === "page" ? "Page" : "Astro SEO Audit health"} score: ${scoreText(report.score, enabled)}/100`,
  );
  lines.push("");
  lines.push(`${severity("error", "✕ Errors")}       ${report.summary.errors}`);
  lines.push(`${severity("warning", "⚠ Warnings")}     ${report.summary.warnings}`);
  lines.push(`${severity("info", "ⓘ Notices")}      ${report.summary.info}`);
  lines.push(`${color(pc.green, "✓ Checks passed")} ${report.summary.passedChecks}`);

  if (report.baseline) {
    lines.push("");
    lines.push(
      `${report.baseline.newFindings.length} new finding${report.baseline.newFindings.length === 1 ? "" : "s"}; ${report.baseline.knownFindings} known finding${report.baseline.knownFindings === 1 ? "" : "s"} suppressed by baseline`,
    );
  }

  if (options.quiet) {
    lines.push("");
    lines.push(completionLine(report, enabled));
    return `${lines.join("\n")}\n`;
  }

  const visibleFindings = report.baseline?.newFindings ?? report.findings;
  if (report.mode === "page") {
    renderPageResult(lines, report.pages[0], visibleFindings, { color, heading, dim, severity });
  } else {
    renderSiteResult(lines, report, visibleFindings, options, { color, heading, dim, severity });
  }

  lines.push(completionLine(report, enabled));
  return `${lines.join("\n")}\n`;
}

interface Formatters {
  color: (fn: (value: string) => string, value: string) => string;
  heading: (value: string) => string;
  dim: (value: string) => string;
  severity: (value: Severity, text: string) => string;
}

function renderPageResult(
  lines: string[],
  page: PageResult | undefined,
  findings: Finding[],
  format: Formatters,
): void {
  if (!page) return;
  lines.push("");
  lines.push(format.heading("Page audit"));
  lines.push("");
  lines.push(format.heading(page.path));
  if (page.source) lines.push(`  ${format.dim(`Likely source: ${page.source}`)}`);

  lines.push("");
  lines.push(format.heading("Needs attention"));
  lines.push("");
  if (findings.length === 0) {
    lines.push(format.color(pc.green, "✓ Ready to publish. This page passed every enabled check."));
  } else {
    for (const item of [...findings].sort(compareFindings)) {
      lines.push(format.severity(item.severity, `${icon(item.severity)} ${item.ruleName}`));
      lines.push(`  ${format.dim(item.ruleId)}`);
      lines.push(`  ${item.message}`);
      if (item.evidence) lines.push(`  ${format.dim("Found:")} ${truncate(item.evidence, 240)}`);
      lines.push(`  ${format.dim("Why it matters:")} ${item.description}`);
      lines.push(`  ${format.dim("How to fix:")} ${item.help}`);
      lines.push("");
    }
  }

  lines.push(format.heading("Passed areas"));
  lines.push("");
  const passedByCategory = new Map<string, number>();
  for (const ruleId of page.passedRules) {
    const category = pageRuleMetadata.get(ruleId)?.category ?? "other";
    passedByCategory.set(category, (passedByCategory.get(category) ?? 0) + 1);
  }
  for (const [category, count] of [...passedByCategory].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    lines.push(
      `${format.color(pc.green, "✓")} ${categoryLabel(category)} (${count} check${count === 1 ? "" : "s"})`,
    );
  }
  if (page.schemaTypes.length) {
    lines.push(`${format.color(pc.green, "✓")} Structured data: ${page.schemaTypes.join(", ")}`);
  }
  lines.push("");
}

function renderSiteResult(
  lines: string[],
  report: AuditReport,
  findings: Finding[],
  options: TerminalReporterOptions,
  format: Formatters,
): void {
  const groups = groupFindings(findings);
  const maxGroups = options.maxIssues ?? 10;
  lines.push("");
  lines.push(format.heading("Issues by type"));
  lines.push("");
  if (groups.length === 0) {
    lines.push(format.color(pc.green, "✓ No findings."));
  } else {
    for (const group of groups.slice(0, maxGroups)) {
      const paths = affectedPaths(group.items);
      const countText = `${group.items.length} finding${group.items.length === 1 ? "" : "s"}`;
      const pageText = paths.length
        ? ` · ${paths.length} affected URL${paths.length === 1 ? "" : "s"}`
        : "";
      lines.push(
        format.severity(
          group.severity,
          `${icon(group.severity)} ${group.items[0]?.ruleName ?? group.ruleId}`,
        ),
      );
      lines.push(`  ${format.dim(group.ruleId)} · ${countText}${pageText}`);
      if (paths.length) {
        const shown = paths.slice(0, 3);
        const remainder = paths.length - shown.length;
        lines.push(
          `  ${shown.join("  ")}${remainder ? `  ${format.dim(`+${remainder} more`)}` : ""}`,
        );
      } else if (group.items[0]?.message) {
        lines.push(`  ${group.items[0].message}`);
      }
      lines.push("");
    }
    if (groups.length > maxGroups) {
      lines.push(
        format.dim(`… ${groups.length - maxGroups} more issue types in the HTML dashboard.`),
      );
      lines.push("");
    }
  }

  lines.push(format.heading("Site-wide"));
  lines.push("");
  lines.push(
    siteStatus(report, "sitemap.missing", "Sitemap detected", "No sitemap detected", format),
  );
  lines.push(
    siteStatus(
      report,
      "robots-txt.missing",
      "robots.txt detected",
      "No robots.txt detected",
      format,
    ),
  );
  const orphanCount = report.siteFindings.filter(
    (finding) => finding.ruleId === "links.orphan-page",
  ).length;
  lines.push(
    orphanCount
      ? `${format.severity("warning", "⚠")} ${orphanCount} orphan page${orphanCount === 1 ? "" : "s"}`
      : report.sitePassedRules.includes("links.orphan-page")
        ? `${format.color(pc.green, "✓")} No orphan pages`
        : `${format.dim("–")} Orphan check disabled`,
  );

  const affected = report.pages
    .map((page) => ({ page, findings: findingsForPage(report, page) }))
    .filter(({ findings }) => findings.length > 0)
    .sort(
      (left, right) =>
        pagePriority(right.findings) - pagePriority(left.findings) ||
        left.page.path.localeCompare(right.page.path),
    );
  if (affected.length) {
    const maxPages = options.maxPages ?? 10;
    lines.push("");
    lines.push(format.heading("Most affected pages"));
    lines.push("");
    for (const { page, findings: pageFindings } of affected.slice(0, maxPages)) {
      const counts = countBySeverity(pageFindings);
      lines.push(
        `${page.path}  ${page.score}/100  ${format.severity("error", `✕ ${counts.error}`)}  ${format.severity("warning", `⚠ ${counts.warning}`)}  ${format.severity("info", `ⓘ ${counts.info}`)}`,
      );
    }
    if (affected.length > maxPages) {
      lines.push(format.dim(`… ${affected.length - maxPages} more affected pages.`));
    }
  }

  if (findings.length) {
    lines.push("");
    lines.push(
      format.dim("Open the searchable report: npx astro-seo-audit --output astro-seo-report.html"),
    );
    lines.push(format.dim("Inspect one route: npx astro-seo-audit --page /your-route/"));
  }
  lines.push("");
}

function groupFindings(findings: Finding[]) {
  const groups = new Map<string, Finding[]>();
  for (const item of findings) {
    const group = groups.get(item.ruleId) ?? [];
    group.push(item);
    groups.set(item.ruleId, group);
  }
  return [...groups.entries()]
    .map(([ruleId, items]) => ({ ruleId, items, severity: highestSeverity(items) }))
    .sort(
      (left, right) =>
        severityRank(left.severity) - severityRank(right.severity) ||
        right.items.length - left.items.length ||
        left.ruleId.localeCompare(right.ruleId),
    );
}

function affectedPaths(findings: Finding[]): string[] {
  return [
    ...new Set(
      findings.flatMap((item) => [item.path, ...(item.relatedPaths ?? [])]).filter(Boolean),
    ),
  ] as string[];
}

function highestSeverity(findings: Finding[]): Severity {
  return findings.reduce<Severity>(
    (highest, item) =>
      severityRank(item.severity) < severityRank(highest) ? item.severity : highest,
    "info",
  );
}

function compareFindings(left: Finding, right: Finding): number {
  return (
    severityRank(left.severity) - severityRank(right.severity) ||
    left.ruleId.localeCompare(right.ruleId)
  );
}

function severityRank(severity: Severity): number {
  return severity === "error" ? 0 : severity === "warning" ? 1 : 2;
}

function icon(severity: Severity): string {
  return severity === "error" ? "✕" : severity === "warning" ? "⚠" : "ⓘ";
}

function countBySeverity(findings: Finding[]): Record<Severity, number> {
  return {
    error: findings.filter((item) => item.severity === "error").length,
    warning: findings.filter((item) => item.severity === "warning").length,
    info: findings.filter((item) => item.severity === "info").length,
  };
}

function pagePriority(findings: Finding[]): number {
  const counts = countBySeverity(findings);
  return counts.error * 10000 + counts.warning * 100 + counts.info;
}

function findingsForPage(report: AuditReport, page: PageResult): Finding[] {
  return [
    ...page.findings,
    ...report.siteFindings.filter(
      (finding) => finding.path === page.path || finding.relatedPaths?.includes(page.path),
    ),
  ];
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    canonical: "Canonical URLs",
    description: "Meta description",
    headings: "Heading structure",
    images: "Images",
    indexability: "Indexability",
    language: "Language",
    links: "Links",
    schema: "Structured data",
    social: "Social previews",
    title: "Page title",
  };
  return labels[category] ?? category;
}

function scoreText(score: number, enabled: boolean): string {
  if (!enabled) return String(score);
  if (score >= 90) return pc.green(String(score));
  if (score >= 70) return pc.yellow(String(score));
  return pc.red(String(score));
}

function completionLine(report: AuditReport, enabled: boolean): string {
  const message = report.summary.errors
    ? `Completed with ${report.summary.errors} error${report.summary.errors === 1 ? "" : "s"}.`
    : "Completed without errors.";
  return enabled ? (report.summary.errors ? pc.red(message) : pc.green(message)) : message;
}

function truncate(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}

function siteStatus(
  report: AuditReport,
  missingRule: string,
  presentText: string,
  missingText: string,
  format: Formatters,
): string {
  const detected = report.sitePassedRules.includes(missingRule);
  if (detected) return `${format.color(pc.green, "✓")} ${presentText}`;
  if (report.siteFindings.some((finding) => finding.ruleId === missingRule)) {
    return `${format.severity("info", "ⓘ")} ${missingText}`;
  }
  return `${format.dim("–")} Check disabled`;
}
