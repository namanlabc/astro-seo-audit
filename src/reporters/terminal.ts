import pc from "picocolors";
import type { AuditReport, Finding, Severity } from "../types/index.js";

export interface TerminalReporterOptions {
  color?: boolean;
  quiet?: boolean;
  maxIssues?: number;
  maxPages?: number;
}

export function renderTerminal(report: AuditReport, options: TerminalReporterOptions = {}): string {
  const enabled = options.color ?? true;
  const color = (fn: (value: string) => string, value: string): string =>
    enabled ? fn(value) : value;
  const lines: string[] = [];
  const heading = (value: string): string => color(pc.bold, value);
  const dim = (value: string): string => color(pc.dim, value);
  const severity = (value: Severity, text: string): string => {
    const fn = value === "error" ? pc.red : value === "warning" ? pc.yellow : pc.cyan;
    return color(fn, text);
  };

  lines.push(heading("Astro SEO Audit"));
  lines.push(dim("─".repeat(48)));
  lines.push("");
  lines.push(`${report.pagesScanned} page${report.pagesScanned === 1 ? "" : "s"} scanned`);
  lines.push(`Astro SEO Audit health score: ${scoreText(report.score, enabled)}/100`);
  lines.push("");
  lines.push(`${severity("error", "✕ Errors")}       ${report.summary.errors}`);
  lines.push(`${severity("warning", "⚠ Warnings")}     ${report.summary.warnings}`);
  lines.push(`${severity("info", "ⓘ Notices")}      ${report.summary.info}`);
  lines.push(`${color(pc.green, "✓ Checks passed")} ${report.summary.passedChecks}`);

  if (options.quiet) {
    lines.push("");
    lines.push(completionLine(report, enabled));
    return `${lines.join("\n")}\n`;
  }

  const sorted = [...report.findings].sort(compareFindings);
  const maxIssues = options.maxIssues ?? 12;
  lines.push("");
  lines.push(heading("Top issues"));
  lines.push("");
  if (sorted.length === 0) {
    lines.push(color(pc.green, "✓ No findings."));
  } else {
    for (const item of sorted.slice(0, maxIssues)) {
      lines.push(formatFinding(item, enabled));
      if (item.relatedPaths?.length) lines.push(`  ${dim(item.relatedPaths.join("  "))}`);
      if (item.evidence) lines.push(`  ${dim(truncate(item.evidence, 120))}`);
      lines.push("");
    }
    if (sorted.length > maxIssues) {
      lines.push(dim(`… ${sorted.length - maxIssues} more findings available in JSON output.`));
    }
  }

  lines.push("");
  lines.push(heading("Site-wide"));
  lines.push("");
  lines.push(
    siteStatus(report, "sitemap.missing", "Sitemap detected", "No sitemap detected", enabled),
  );
  lines.push(
    siteStatus(
      report,
      "robots-txt.missing",
      "robots.txt detected",
      "No robots.txt detected",
      enabled,
    ),
  );
  const orphanCount = report.siteFindings.filter(
    (finding) => finding.ruleId === "links.orphan-page",
  ).length;
  lines.push(
    orphanCount
      ? `${enabled ? pc.yellow("⚠") : "⚠"} ${orphanCount} orphan page${orphanCount === 1 ? "" : "s"}`
      : report.sitePassedRules.includes("links.orphan-page")
        ? `${enabled ? pc.green("✓") : "✓"} No orphan pages`
        : `${enabled ? pc.dim("–") : "–"} Orphan check disabled`,
  );

  const affectedPages = report.pages.filter((page) => page.findings.length > 0);
  if (affectedPages.length) {
    const maxPages = options.maxPages ?? 20;
    lines.push("");
    lines.push(heading("Pages with findings"));
    lines.push("");
    for (const page of affectedPages.slice(0, maxPages)) {
      lines.push(heading(page.path));
      const grouped = countBySeverity(page.findings);
      lines.push(
        `  ${severity("error", `✕ ${grouped.error}`)}  ${severity("warning", `⚠ ${grouped.warning}`)}  ${severity("info", `ⓘ ${grouped.info}`)}  ${color(pc.green, `✓ ${page.passedRules.length}`)}`,
      );
      for (const item of page.findings.slice(0, 5)) {
        lines.push(`  ${icon(item.severity)} ${item.ruleId}: ${item.message}`);
      }
      if (page.schemaTypes.length) {
        lines.push(`  ${color(pc.green, "✓")} JSON-LD: ${page.schemaTypes.join(", ")}`);
      }
      lines.push("");
    }
    if (affectedPages.length > maxPages) {
      lines.push(
        dim(`… ${affectedPages.length - maxPages} more affected pages available in JSON output.`),
      );
      lines.push("");
    }
  }

  lines.push(completionLine(report, enabled));
  return `${lines.join("\n")}\n`;
}

function formatFinding(item: Finding, enabled: boolean): string {
  const text = `${icon(item.severity)} ${item.ruleId}`;
  const colored = enabled
    ? item.severity === "error"
      ? pc.red(text)
      : item.severity === "warning"
        ? pc.yellow(text)
        : pc.cyan(text)
    : text;
  const location = item.path ? ` ${item.path}` : "";
  return `${colored}${location}\n  ${item.message}`;
}

function compareFindings(left: Finding, right: Finding): number {
  const rank: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  return rank[left.severity] - rank[right.severity] || left.ruleId.localeCompare(right.ruleId);
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
  enabled: boolean,
): string {
  const detected = report.sitePassedRules.includes(missingRule);
  if (detected) return `${enabled ? pc.green("✓") : "✓"} ${presentText}`;
  if (report.siteFindings.some((finding) => finding.ruleId === missingRule)) {
    return `${enabled ? pc.cyan("ⓘ") : "ⓘ"} ${missingText}`;
  }
  return `${enabled ? pc.dim("–") : "–"} Check disabled`;
}
