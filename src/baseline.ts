import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuditReport, BaselineComparison, Finding } from "./types/index.js";

interface BaselineFile {
  schemaVersion: 1;
  generatedAt: string;
  findings: string[];
}

export function findingFingerprint(finding: Finding): string {
  return JSON.stringify({
    ruleId: finding.ruleId,
    scope: finding.scope,
    path: finding.path ?? null,
    url: finding.url ?? null,
    evidence: finding.evidence ?? null,
    relatedPaths: finding.relatedPaths ? [...finding.relatedPaths].sort() : null,
  });
}

export async function compareWithBaseline(
  report: AuditReport,
  cwd: string,
  baselinePath: string,
): Promise<BaselineComparison> {
  const resolved = path.resolve(cwd, baselinePath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(resolved, "utf8")) as unknown;
  } catch (error) {
    if (isMissingFile(error)) {
      throw new Error(
        `Baseline not found: ${resolved}. Create it with --write-baseline ${baselinePath}.`,
      );
    }
    if (error instanceof SyntaxError)
      throw new Error(`Baseline contains invalid JSON: ${resolved}.`);
    throw error;
  }
  if (!isBaselineFile(parsed)) throw new Error(`Invalid Astro SEO Audit baseline: ${resolved}.`);
  const known = new Set(parsed.findings);
  const newFindings = report.findings.filter((finding) => !known.has(findingFingerprint(finding)));
  return {
    path: resolved,
    knownFindings: report.findings.length - newFindings.length,
    newFindings,
  };
}

export async function writeBaseline(
  report: AuditReport,
  cwd: string,
  baselinePath: string,
): Promise<string> {
  const resolved = path.resolve(cwd, baselinePath);
  const baseline: BaselineFile = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    findings: [...new Set(report.findings.map(findingFingerprint))].sort(),
  };
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  return resolved;
}

function isBaselineFile(value: unknown): value is BaselineFile {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<BaselineFile>;
  return (
    candidate.schemaVersion === 1 &&
    Array.isArray(candidate.findings) &&
    candidate.findings.every((item) => typeof item === "string")
  );
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
