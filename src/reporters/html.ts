import type { AuditReport, Finding, Severity } from "../types/index.js";
import { DASHBOARD_PAGE_SIZE, paginationItems } from "./pagination.js";

export function renderHtml(report: AuditReport): string {
  const findings = report.baseline?.newFindings ?? report.findings;
  const data = dashboardData(report, findings);
  const baselineNote = report.baseline
    ? `<p class="baseline"><strong>${report.baseline.newFindings.length}</strong> new and <strong>${report.baseline.knownFindings}</strong> known findings compared with the baseline.</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Astro SEO Audit — ${report.score}/100</title>
  <style>
    :root {
      color-scheme: light;
      --background: #fafafa;
      --surface: #ffffff;
      --surface-subtle: #fafafa;
      --foreground: #18181b;
      --muted: #71717a;
      --border: #e4e4e7;
      --border-strong: #d4d4d8;
      --accent: #18181b;
      --accent-foreground: #ffffff;
      --error: #b91c1c;
      --error-bg: #fef2f2;
      --warning: #a16207;
      --warning-bg: #fefce8;
      --info: #0369a1;
      --info-bg: #f0f9ff;
      --success: #047857;
      --success-bg: #ecfdf5;
      --focus: #2563eb;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--background);
      color: var(--foreground);
      font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    button, input, select { font: inherit; }
    button:focus-visible, input:focus-visible, select:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
    .shell { width: min(1160px, calc(100% - 32px)); margin: 24px auto 48px; }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .brand { font-weight: 650; letter-spacing: -.01em; }
    .meta, .baseline, .muted { color: var(--muted); }
    .summary {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 24px;
      padding: 28px 0 20px;
    }
    .summary h1 { margin: 2px 0 4px; font-size: 26px; line-height: 1.2; letter-spacing: -.025em; }
    .eyebrow {
      color: var(--muted);
      font-size: 11px;
      font-weight: 650;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .score { display: flex; align-items: baseline; gap: 7px; white-space: nowrap; }
    .score strong { font-size: 32px; line-height: 1; letter-spacing: -.04em; }
    .score span { color: var(--muted); font-size: 13px; }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
    }
    .stat { padding: 14px 16px; border-right: 1px solid var(--border); }
    .stat:last-child { border-right: 0; }
    .stat strong { display: block; font-size: 20px; line-height: 1.25; font-weight: 650; }
    .stat span { color: var(--muted); font-size: 12px; }
    .panel {
      margin-top: 16px;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
    }
    .panel-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }
    .panel-head h2 { margin: 0 0 2px; font-size: 15px; letter-spacing: -.01em; }
    .panel-head p { margin: 0; font-size: 12px; }
    .toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .search, select {
      height: 34px;
      border: 1px solid var(--border-strong);
      border-radius: 6px;
      background: var(--surface);
      color: var(--foreground);
      padding: 0 10px;
    }
    .search { width: min(280px, 100%); }
    .search::placeholder { color: var(--muted); }
    .filters { display: flex; gap: 4px; flex-wrap: wrap; }
    .filter, .action, .page-button {
      border: 1px solid var(--border-strong);
      border-radius: 6px;
      background: var(--surface);
      color: var(--foreground);
      padding: 6px 10px;
      cursor: pointer;
    }
    .filter:hover, .action:hover, .page-button:hover { background: var(--surface-subtle); }
    .filter.active, .page-button.current {
      border-color: var(--accent);
      background: var(--accent);
      color: var(--accent-foreground);
    }
    .issue-list { display: grid; }
    .issue {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }
    .issue:last-child { border-bottom: 0; }
    .issue:hover { background: var(--surface-subtle); }
    .severity-dot { width: 8px; height: 8px; border-radius: 50%; }
    .severity-dot.error { background: var(--error); }
    .severity-dot.warning { background: var(--warning); }
    .severity-dot.info { background: var(--info); }
    .issue strong { display: block; font-size: 13px; font-weight: 600; }
    .issue code, .route {
      color: var(--muted);
      font: 12px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace;
    }
    .counts { text-align: right; color: var(--muted); font-size: 12px; white-space: nowrap; }
    .action { font-size: 12px; font-weight: 550; }
    .empty { padding: 32px 16px; text-align: center; color: var(--muted); }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 760px; }
    th, td { padding: 10px 12px; border-bottom: 1px solid var(--border); text-align: left; }
    th {
      background: var(--surface-subtle);
      color: var(--muted);
      font-size: 11px;
      font-weight: 550;
      letter-spacing: .02em;
    }
    tbody tr:last-child td { border-bottom: 0; }
    tbody tr:hover { background: var(--surface-subtle); }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border: 1px solid transparent;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge.error { border-color: #fecaca; background: var(--error-bg); color: var(--error); }
    .badge.warning { border-color: #fde68a; background: var(--warning-bg); color: var(--warning); }
    .badge.info { border-color: #bae6fd; background: var(--info-bg); color: var(--info); }
    .badge.clean { border-color: #a7f3d0; background: var(--success-bg); color: var(--success); }
    .table-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 12px;
    }
    .pager, .page-numbers, .detail-actions { display: flex; align-items: center; gap: 5px; }
    .page-button { min-width: 30px; padding: 5px 8px; font-size: 12px; }
    .page-button:disabled { cursor: not-allowed; opacity: .45; }
    .page-ellipsis { padding: 0 2px; }
    .active-rule {
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin: 12px 16px 0;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--surface-subtle);
      font-size: 12px;
    }
    .active-rule.visible { display: flex; }
    .active-rule button { border: 0; background: transparent; color: var(--muted); cursor: pointer; }
    .detail {
      display: none;
      margin: 0 16px 16px;
      padding: 16px;
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      background: var(--surface-subtle);
    }
    .detail.visible { display: block; }
    .detail-head { display: flex; justify-content: space-between; gap: 16px; }
    .detail h3 { margin: 0; font: 600 14px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .detail-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(250px, .5fr); gap: 12px; margin-top: 14px; }
    .detail-section { padding: 14px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); }
    .detail-section h4 { margin: 0 0 10px; font-size: 12px; font-weight: 650; }
    .finding { padding: 12px 0; border-top: 1px solid var(--border); }
    .finding:first-of-type { border-top: 0; padding-top: 0; }
    .finding:last-child { padding-bottom: 0; }
    .finding p { margin: 5px 0; }
    .finding .why, .finding .fix { color: var(--muted); }
    .finding code { display: block; overflow-wrap: anywhere; white-space: pre-wrap; font-size: 12px; }
    .passed-groups { display: grid; gap: 6px; }
    .passed {
      padding: 6px 8px;
      border-left: 2px solid var(--success);
      background: var(--success-bg);
      color: var(--success);
      font-size: 12px;
    }
    .footer { display: flex; justify-content: space-between; gap: 12px; margin: 16px 0 0; color: var(--muted); font-size: 11px; }
    .footer a { color: inherit; text-underline-offset: 3px; }
    .footer a:hover { color: var(--foreground); }
    @media (max-width: 760px) {
      .shell { width: min(100% - 20px, 1160px); margin-top: 14px; }
      .topbar, .summary, .panel-head, .table-footer, .detail-head, .footer { align-items: flex-start; flex-direction: column; }
      .summary { padding-top: 22px; }
      .stats { grid-template-columns: repeat(2, 1fr); }
      .stat:nth-child(2) { border-right: 0; }
      .stat:nth-child(-n+2) { border-bottom: 1px solid var(--border); }
      .panel-head { padding: 14px; }
      .toolbar, .search { width: 100%; }
      .issue { grid-template-columns: auto 1fr; }
      .issue .action { grid-column: 2; justify-self: start; }
      .counts { display: none; }
      .detail { margin: 0 10px 10px; }
      .detail-grid { grid-template-columns: 1fr; }
      .pager { flex-wrap: wrap; }
    }
    @media (prefers-color-scheme: dark) {
      :root {
        color-scheme: dark;
        --background: #09090b;
        --surface: #0f0f12;
        --surface-subtle: #151518;
        --foreground: #fafafa;
        --muted: #a1a1aa;
        --border: #27272a;
        --border-strong: #3f3f46;
        --accent: #fafafa;
        --accent-foreground: #18181b;
        --error: #fca5a5;
        --error-bg: #2b1215;
        --warning: #fde68a;
        --warning-bg: #29220f;
        --info: #7dd3fc;
        --info-bg: #0c2633;
        --success: #6ee7b7;
        --success-bg: #0c2b20;
      }
      .badge.error { border-color: #7f1d1d; }
      .badge.warning { border-color: #713f12; }
      .badge.info { border-color: #075985; }
      .badge.clean { border-color: #065f46; }
    }
  </style>
</head>
<body><main class="shell">
  <div class="topbar"><div class="brand">Astro SEO Audit</div><div class="meta">Standalone local report · ${escapeHtml(report.version)}</div></div>
  <section class="summary"><div><div class="eyebrow">${report.mode === "page" ? "Page audit" : "Site audit"}</div><h1>SEO health report</h1><p class="meta">${report.pagesScanned} page${report.pagesScanned === 1 ? "" : "s"} scanned · ${escapeHtml(report.generatedAt)}</p>${baselineNote}</div><div class="score" aria-label="Health score ${report.score} out of 100"><strong>${report.score}</strong><span>/ 100</span></div></section>
  <section class="stats">
    ${stat("Errors", report.summary.errors)}${stat("Warnings", report.summary.warnings)}${stat("Notices", report.summary.info)}${stat("Passed checks", report.summary.passedChecks)}
  </section>

  <section class="panel" aria-labelledby="issues-title">
    <div class="panel-head"><div><h2 id="issues-title">Issues by type</h2><p class="muted">Start with recurring problems, then open only the affected URLs.</p></div><div class="toolbar"><input class="search" id="issue-search" type="search" placeholder="Search issue or URL" aria-label="Search issues"><div class="filters" id="issue-filters" aria-label="Filter issues by severity"></div></div></div>
    <div class="issue-list" id="issue-list"></div>
  </section>

  <section class="panel" id="pages-panel" aria-labelledby="pages-title">
    <div class="panel-head"><div><h2 id="pages-title">Pages</h2><p class="muted">Search, filter and inspect one page at a time. Results are shown 30 URLs at a time.</p></div><div class="toolbar"><input class="search" id="page-search" type="search" placeholder="Search route or source" aria-label="Search pages"><select id="page-severity" aria-label="Filter pages"><option value="all">All pages</option><option value="error">With errors</option><option value="warning">With warnings</option><option value="info">With notices</option><option value="clean">Clean pages</option></select></div></div>
    <div class="active-rule" id="active-rule"><span></span><button type="button" aria-label="Clear issue filter">Clear ×</button></div>
    <div class="table-wrap"><table><thead><tr><th>Route</th><th>Score</th><th>Likely source</th><th>Status</th><th>Findings</th><th>Passed</th><th></th></tr></thead><tbody id="page-rows"></tbody></table></div>
    <div class="table-footer"><span id="page-count"></span><nav class="pager" id="page-pager" aria-label="Pages pagination"><button class="page-button" id="prev-page" type="button">Previous</button><span class="page-numbers" id="page-numbers"></span><span class="muted" id="page-number"></span><button class="page-button" id="next-page" type="button">Next</button></nav></div>
    <section class="detail" id="page-detail" aria-live="polite"></section>
  </section>
  <footer class="footer"><span>Generated locally by Astro SEO Audit ${escapeHtml(report.version)}. No page content was uploaded.</span><span>Built by <a href="https://x.com/namanlabs" target="_blank" rel="noopener noreferrer">Naman Labs</a></span></footer>
</main>
<script type="application/json" id="audit-data">${serializeForScript(data)}</script>
<script>
  (function () {
    "use strict";
    var data = JSON.parse(document.getElementById("audit-data").textContent || "{}");
    var issueSeverity = "all";
    var selectedRule = "";
    var currentPage = 1;
    var pageSize = ${DASHBOARD_PAGE_SIZE};

    ${paginationItems.toString()}

    function node(tag, className, text) {
      var element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    }
    function severityRank(value) { return value === "error" ? 0 : value === "warning" ? 1 : 2; }
    function statusFor(page) {
      if (page.counts.error) return "error";
      if (page.counts.warning) return "warning";
      if (page.counts.info) return "info";
      return "clean";
    }
    function statusText(page) {
      var status = statusFor(page);
      return status === "clean" ? "Clean" : status.charAt(0).toUpperCase() + status.slice(1);
    }
    function categoryLabel(value) {
      var labels = { canonical: "Canonical URLs", description: "Meta description", headings: "Heading structure", images: "Images", indexability: "Indexability", language: "Language", links: "Links", schema: "Structured data", social: "Social previews", title: "Page title" };
      return labels[value] || value;
    }
    function hideDetail() {
      var target = document.getElementById("page-detail");
      target.classList.remove("visible");
      target.replaceChildren();
    }

    function renderIssueFilters() {
      var wrap = document.getElementById("issue-filters");
      wrap.replaceChildren();
      ["all", "error", "warning", "info"].forEach(function (value) {
        var label = value === "all" ? "All" : value === "info" ? "Notices" : value.charAt(0).toUpperCase() + value.slice(1) + "s";
        var button = node("button", "filter" + (issueSeverity === value ? " active" : ""), label);
        button.type = "button";
        button.addEventListener("click", function () { issueSeverity = value; renderIssueFilters(); renderIssues(); });
        wrap.appendChild(button);
      });
    }

    function renderIssues() {
      var target = document.getElementById("issue-list");
      target.replaceChildren();
      var query = document.getElementById("issue-search").value.trim().toLowerCase();
      var groups = data.issueGroups.filter(function (group) {
        var matchesSeverity = issueSeverity === "all" || group.severity === issueSeverity;
        var haystack = [group.ruleId, group.ruleName, group.message].concat(group.paths).join(" ").toLowerCase();
        return matchesSeverity && (!query || haystack.indexOf(query) !== -1);
      });
      if (!groups.length) { target.appendChild(node("div", "empty", "No issues match these filters.")); return; }
      groups.forEach(function (group) {
        var item = node("article", "issue");
        item.appendChild(node("span", "severity-dot " + group.severity));
        var copy = node("div");
        copy.appendChild(node("strong", "", group.ruleName));
        copy.appendChild(node("code", "", group.ruleId));
        if (!group.paths.length) copy.appendChild(node("div", "muted", group.message));
        item.appendChild(copy);
        item.appendChild(node("div", "counts", group.count + " finding" + (group.count === 1 ? "" : "s") + " · " + group.paths.length + " URL" + (group.paths.length === 1 ? "" : "s")));
        if (group.paths.length) {
          var button = node("button", "action", "View affected URLs");
          button.type = "button";
          button.addEventListener("click", function () {
            selectedRule = group.ruleId;
            currentPage = 1;
            renderPages();
            document.getElementById("pages-panel").scrollIntoView({ behavior: "smooth", block: "start" });
          });
          item.appendChild(button);
        }
        target.appendChild(item);
      });
    }

    function filteredPages() {
      var query = document.getElementById("page-search").value.trim().toLowerCase();
      var severity = document.getElementById("page-severity").value;
      return data.pages.filter(function (page) {
        var matchesQuery = !query || (page.path + " " + (page.source || "")).toLowerCase().indexOf(query) !== -1;
        var matchesSeverity = severity === "all" || statusFor(page) === severity || (severity !== "clean" && page.counts[severity] > 0);
        var matchesRule = !selectedRule || page.findings.some(function (finding) { return finding.ruleId === selectedRule; });
        return matchesQuery && matchesSeverity && matchesRule;
      }).sort(function (left, right) {
        var severityDifference = severityRank(statusFor(left)) - severityRank(statusFor(right));
        if (statusFor(left) === "clean" && statusFor(right) !== "clean") severityDifference = 1;
        if (statusFor(right) === "clean" && statusFor(left) !== "clean") severityDifference = -1;
        return severityDifference || right.findings.length - left.findings.length || left.path.localeCompare(right.path);
      });
    }

    function renderPages() {
      var pages = filteredPages();
      var totalPages = Math.ceil(pages.length / pageSize);
      currentPage = totalPages ? Math.max(1, Math.min(currentPage, totalPages)) : 1;
      var start = (currentPage - 1) * pageSize;
      var shown = pages.slice(start, start + pageSize);
      hideDetail();
      var rows = document.getElementById("page-rows");
      rows.replaceChildren();
      shown.forEach(function (page) {
        var row = document.createElement("tr");
        var routeCell = document.createElement("td"); routeCell.appendChild(node("code", "route", page.path)); row.appendChild(routeCell);
        var scoreCell = document.createElement("td"); scoreCell.textContent = page.score + "/100"; row.appendChild(scoreCell);
        var sourceCell = document.createElement("td"); sourceCell.textContent = page.source || "—"; row.appendChild(sourceCell);
        var statusCell = document.createElement("td"); statusCell.appendChild(node("span", "badge " + statusFor(page), statusText(page))); row.appendChild(statusCell);
        var findingsCell = document.createElement("td"); findingsCell.textContent = String(page.findings.length); row.appendChild(findingsCell);
        var passedCell = document.createElement("td"); passedCell.textContent = String(page.passedCount); row.appendChild(passedCell);
        var actionCell = document.createElement("td"); var button = node("button", "action", "Inspect"); button.type = "button"; button.addEventListener("click", function () { renderDetail(page); }); actionCell.appendChild(button); row.appendChild(actionCell);
        rows.appendChild(row);
      });
      if (!shown.length) {
        var emptyRow = document.createElement("tr"); var emptyCell = node("td", "empty", "No pages match these filters."); emptyCell.colSpan = 7; emptyRow.appendChild(emptyCell); rows.appendChild(emptyRow);
      }
      document.getElementById("page-count").textContent = pages.length ? "Showing " + (start + 1) + "–" + Math.min(start + pageSize, pages.length) + " of " + pages.length + " pages" : "0 pages";
      renderPagination(totalPages);
      var rule = document.getElementById("active-rule");
      rule.classList.toggle("visible", Boolean(selectedRule));
      rule.querySelector("span").textContent = selectedRule ? "Showing URLs affected by " + selectedRule : "";
    }

    function renderPagination(totalPages) {
      var pager = document.getElementById("page-pager");
      var numbers = document.getElementById("page-numbers");
      numbers.replaceChildren();
      pager.hidden = totalPages <= 1;
      paginationItems(totalPages, currentPage).forEach(function (item) {
        if (item === "ellipsis") {
          var ellipsis = node("span", "page-ellipsis", "…");
          ellipsis.setAttribute("aria-hidden", "true");
          numbers.appendChild(ellipsis);
          return;
        }
        var button = node("button", "page-button" + (item === currentPage ? " current" : ""), String(item));
        button.type = "button";
        button.setAttribute("aria-label", "Go to page " + item);
        if (item === currentPage) button.setAttribute("aria-current", "page");
        button.addEventListener("click", function () { currentPage = item; renderPages(); });
        numbers.appendChild(button);
      });
      document.getElementById("page-number").textContent = totalPages ? "Page " + currentPage + " of " + totalPages : "";
      document.getElementById("prev-page").disabled = totalPages <= 1 || currentPage <= 1;
      document.getElementById("next-page").disabled = totalPages <= 1 || currentPage >= totalPages;
    }

    function renderDetail(page) {
      var target = document.getElementById("page-detail");
      target.replaceChildren(); target.classList.add("visible");
      var head = node("div", "detail-head"); var title = node("div"); title.appendChild(node("h3", "", page.path)); title.appendChild(node("div", "muted", page.source ? "Likely source: " + page.source : "Generated file: " + page.file)); head.appendChild(title); var actions = node("div", "detail-actions"); actions.appendChild(node("span", "badge " + statusFor(page), page.score + "/100 · " + statusText(page))); var close = node("button", "action", "Close"); close.type = "button"; close.addEventListener("click", hideDetail); actions.appendChild(close); head.appendChild(actions); target.appendChild(head);
      var grid = node("div", "detail-grid");
      var needs = node("div", "detail-section"); needs.appendChild(node("h4", "", "Needs attention"));
      if (!page.findings.length) needs.appendChild(node("div", "empty", "Ready to publish. This page passed every enabled check."));
      page.findings.forEach(function (finding) {
        var item = node("article", "finding"); item.appendChild(node("span", "badge " + finding.severity, finding.severity === "info" ? "Notice" : finding.severity)); item.appendChild(node("p", "", finding.ruleName + " · " + finding.ruleId)); item.appendChild(node("p", "", finding.message)); if (finding.evidence) item.appendChild(node("code", "", "Found: " + finding.evidence)); item.appendChild(node("p", "why", "Why it matters: " + finding.description)); item.appendChild(node("p", "fix", "How to fix: " + finding.help)); needs.appendChild(item);
      });
      grid.appendChild(needs);
      var passed = node("div", "detail-section"); passed.appendChild(node("h4", "", "Passed areas")); var passedWrap = node("div", "passed-groups"); Object.keys(page.passedByCategory).sort().forEach(function (category) { passedWrap.appendChild(node("span", "passed", categoryLabel(category) + " · " + page.passedByCategory[category])); }); if (page.schemaTypes.length) passedWrap.appendChild(node("span", "passed", "Structured data · " + page.schemaTypes.join(", "))); passed.appendChild(passedWrap); grid.appendChild(passed); target.appendChild(grid); target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    document.getElementById("issue-search").addEventListener("input", renderIssues);
    document.getElementById("page-search").addEventListener("input", function () { currentPage = 1; renderPages(); });
    document.getElementById("page-severity").addEventListener("change", function () { currentPage = 1; renderPages(); });
    document.getElementById("prev-page").addEventListener("click", function () { if (currentPage > 1) { currentPage -= 1; renderPages(); } });
    document.getElementById("next-page").addEventListener("click", function () { var totalPages = Math.ceil(filteredPages().length / pageSize); if (currentPage < totalPages) { currentPage += 1; renderPages(); } });
    document.querySelector("#active-rule button").addEventListener("click", function () { selectedRule = ""; currentPage = 1; renderPages(); });
    renderIssueFilters(); renderIssues(); renderPages();
  })();
</script>
</body></html>\n`;
}

function dashboardData(report: AuditReport, visibleFindings: Finding[]) {
  const visible = new Set(visibleFindings);
  const issueGroups = new Map<string, Finding[]>();
  for (const finding of visibleFindings) {
    const group = issueGroups.get(finding.ruleId) ?? [];
    group.push(finding);
    issueGroups.set(finding.ruleId, group);
  }
  const siteFindings = visibleFindings.filter((finding) => finding.scope === "site");

  return {
    issueGroups: [...issueGroups.entries()]
      .map(([ruleId, findings]) => ({
        ruleId,
        ruleName: findings[0]?.ruleName ?? ruleId,
        message: findings[0]?.message ?? "",
        severity: highestSeverity(findings),
        count: findings.length,
        paths: affectedPaths(findings),
      }))
      .sort(
        (left, right) =>
          severityRank(left.severity) - severityRank(right.severity) ||
          right.count - left.count ||
          left.ruleId.localeCompare(right.ruleId),
      ),
    pages: report.pages.map((page) => {
      const findings = [
        ...page.findings.filter((finding) => visible.has(finding)),
        ...siteFindings.filter((finding) => finding.relatedPaths?.includes(page.path)),
      ];
      const passedByCategory: Record<string, number> = {};
      for (const ruleId of page.passedRules) {
        const category = ruleId.split(".")[0] ?? "other";
        passedByCategory[category] = (passedByCategory[category] ?? 0) + 1;
      }
      return {
        path: page.path,
        source: page.source,
        file: page.file,
        indexable: page.indexable,
        score: page.score,
        findings,
        counts: countBySeverity(findings),
        passedCount: page.passedRules.length,
        passedByCategory,
        schemaTypes: page.schemaTypes,
      };
    }),
  };
}

function stat(label: string, value: number): string {
  return `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`;
}

function countBySeverity(findings: Finding[]): Record<Severity, number> {
  return {
    error: findings.filter((finding) => finding.severity === "error").length,
    warning: findings.filter((finding) => finding.severity === "warning").length,
    info: findings.filter((finding) => finding.severity === "info").length,
  };
}

function affectedPaths(findings: Finding[]): string[] {
  return [
    ...new Set(
      findings
        .flatMap((finding) => [finding.path, ...(finding.relatedPaths ?? [])])
        .filter(Boolean),
    ),
  ] as string[];
}

function highestSeverity(findings: Finding[]): Severity {
  return findings.reduce<Severity>(
    (highest, finding) =>
      severityRank(finding.severity) < severityRank(highest) ? finding.severity : highest,
    "info",
  );
}

function severityRank(severity: Severity): number {
  return severity === "error" ? 0 : severity === "warning" ? 1 : 2;
}

function serializeForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
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
