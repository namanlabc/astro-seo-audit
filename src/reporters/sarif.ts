import type { AuditReport, Finding, Severity } from "../types/index.js";

export function renderSarif(report: AuditReport): string {
  const findings = report.baseline?.newFindings ?? report.findings;
  const metadata = new Map(
    findings.map((finding) => [
      finding.ruleId,
      {
        id: finding.ruleId,
        name: finding.ruleName,
        shortDescription: { text: finding.message },
        help: { text: finding.help },
      },
    ]),
  );
  const results = findings.map((finding) => ({
    ruleId: finding.ruleId,
    level: sarifLevel(finding.severity),
    message: { text: finding.message },
    locations: [locationFor(report, finding)],
  }));
  return `${JSON.stringify(
    {
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "Astro SEO Audit",
              informationUri: "https://github.com/namanlabc/astro-seo-audit",
              semanticVersion: report.version,
              rules: [...metadata.values()],
            },
          },
          results,
        },
      ],
    },
    null,
    2,
  )}\n`;
}

function locationFor(report: AuditReport, finding: Finding) {
  const page = finding.path
    ? report.pages.find((candidate) => candidate.path === finding.path)
    : undefined;
  return {
    physicalLocation: {
      artifactLocation: { uri: page?.source ?? page?.file ?? "astro-seo-audit.config.json" },
    },
    logicalLocations: finding.path ? [{ name: finding.path, kind: "route" }] : undefined,
  };
}

function sarifLevel(severity: Severity): "error" | "warning" | "note" {
  return severity === "info" ? "note" : severity;
}
