import type {
  AuditConfig,
  Finding,
  NormalizedPage,
  RuleMetadata,
  Severity,
} from "../types/index.js";

export function finding(
  meta: RuleMetadata,
  config: AuditConfig,
  message: string,
  page?: NormalizedPage,
  extra: Partial<Pick<Finding, "evidence" | "relatedPaths" | "url">> = {},
): Finding {
  return {
    ruleId: meta.id,
    ruleName: meta.name,
    category: meta.category,
    severity: config.severityOverrides[meta.id] ?? meta.defaultSeverity,
    scope: meta.scope,
    message,
    description: meta.description,
    help: meta.help,
    path: page?.route,
    url: extra.url ?? page?.url,
    evidence: extra.evidence,
    relatedPaths: extra.relatedPaths,
  };
}

export function severityAtOrAbove(actual: Severity, threshold: Severity): boolean {
  const rank: Record<Severity, number> = { info: 1, warning: 2, error: 3 };
  return rank[actual] >= rank[threshold];
}
