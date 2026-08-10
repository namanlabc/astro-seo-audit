import type { AuditReport, Finding, Severity } from "../types/index.js";

export function renderHtml(report: AuditReport): string {
  const findings = report.baseline?.newFindings ?? report.findings;
  const baselineNote = report.baseline
    ? `<p class="baseline"><strong>${report.baseline.newFindings.length}</strong> new and <strong>${report.baseline.knownFindings}</strong> known findings compared with the baseline.</p>`
    : "";
  const rows = findings.length
    ? findings.map(renderFinding).join("")
    : `<div class="empty">No findings. This build passed every enabled check.</div>`;
  const pageRows = report.pages
    .map(
      (page) =>
        `<tr><td><code>${escapeHtml(page.path)}</code></td><td>${page.source ? `<code>${escapeHtml(page.source)}</code>` : "—"}</td><td>${page.indexable ? "Yes" : "No"}</td><td>${page.findings.length}</td><td>${page.passedRules.length}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Astro SEO Audit — ${report.score}/100</title>
  <style>
    :root{color-scheme:light dark;--bg:#f5f7f6;--panel:#fff;--text:#17201c;--muted:#66716b;--line:#dce4df;--green:#138a5b;--red:#c13a3a;--amber:#a76300;--blue:#2470b8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{width:min(1040px,calc(100% - 32px));margin:48px auto}.eyebrow{color:var(--green);font-weight:750;letter-spacing:.08em;text-transform:uppercase}.hero{display:flex;justify-content:space-between;gap:24px;align-items:end;margin:10px 0 26px}.hero h1{font-size:clamp(32px,6vw,64px);line-height:1;margin:0}.score{min-width:145px;padding:20px;border:1px solid var(--line);border-radius:22px;background:var(--panel);text-align:center}.score strong{display:block;font-size:44px;line-height:1;color:var(--green)}.score span{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.stat,.panel{background:var(--panel);border:1px solid var(--line);border-radius:16px}.stat{padding:16px}.stat strong{display:block;font-size:24px}.stat span,.meta,.baseline{color:var(--muted)}.panel{padding:22px;margin-top:18px}h2{margin:0 0 16px;font-size:21px}.finding{padding:16px 0;border-top:1px solid var(--line)}.finding:first-of-type{border-top:0}.pill{display:inline-block;padding:3px 8px;border-radius:99px;font-size:12px;font-weight:750;text-transform:uppercase}.error{background:#fee8e8;color:var(--red)}.warning{background:#fff0d5;color:var(--amber)}.info{background:#e7f2ff;color:var(--blue)}.finding h3{font-size:16px;margin:9px 0 4px}.finding p{margin:4px 0}.finding code,td code{font-size:13px}.help{color:var(--muted)}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:10px;border-bottom:1px solid var(--line)}th{color:var(--muted);font-size:12px;text-transform:uppercase}.empty{padding:34px;text-align:center;color:var(--green);font-weight:700}.footer{margin:22px 0;color:var(--muted);font-size:13px}@media(max-width:700px){.hero{align-items:start;flex-direction:column}.grid{grid-template-columns:repeat(2,1fr)}.panel{overflow-x:auto}}@media(prefers-color-scheme:dark){:root{--bg:#101512;--panel:#171e1a;--text:#eef5f0;--muted:#99a69e;--line:#2b3730;--green:#56d79d}}
  </style>
</head>
<body><main class="wrap">
  <div class="eyebrow">Astro SEO Audit</div>
  <section class="hero"><div><h1>SEO health report</h1><p class="meta">${report.pagesScanned} page${report.pagesScanned === 1 ? "" : "s"} scanned · ${escapeHtml(report.generatedAt)}</p></div><div class="score"><strong>${report.score}</strong><span>out of 100</span></div></section>
  <section class="grid">
    ${stat("Errors", report.summary.errors)}${stat("Warnings", report.summary.warnings)}${stat("Notices", report.summary.info)}${stat("Passed", report.summary.passedChecks)}
  </section>
  <section class="panel"><h2>${report.baseline ? "New findings" : "Findings"}</h2>${baselineNote}${rows}</section>
  <section class="panel"><h2>Pages</h2><table><thead><tr><th>Route</th><th>Likely source</th><th>Indexable</th><th>Findings</th><th>Passed</th></tr></thead><tbody>${pageRows}</tbody></table></section>
  <p class="footer">Generated locally by Astro SEO Audit ${escapeHtml(report.version)}. No page content was uploaded.</p>
</main></body></html>\n`;
}

function stat(label: string, value: number): string {
  return `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`;
}

function renderFinding(finding: Finding): string {
  const location = finding.path ? ` · <code>${escapeHtml(finding.path)}</code>` : "";
  const evidence = finding.evidence ? `<p><code>${escapeHtml(finding.evidence)}</code></p>` : "";
  return `<article class="finding"><span class="pill ${finding.severity}">${severityLabel(finding.severity)}</span><h3>${escapeHtml(finding.ruleId)}${location}</h3><p>${escapeHtml(finding.message)}</p>${evidence}<p class="help">${escapeHtml(finding.help)}</p></article>`;
}

function severityLabel(severity: Severity): string {
  return severity === "info" ? "Notice" : severity;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}
