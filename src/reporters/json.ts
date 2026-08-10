import type { AuditReport } from "../types/index.js";

export function renderJson(report: AuditReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
