import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { audit } from "../src/audit.js";
import { renderHtml } from "../src/reporters/html.js";
import { DASHBOARD_PAGE_SIZE, paginationItems } from "../src/reporters/pagination.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("HTML reporter", () => {
  it("creates a standalone human-readable report", async () => {
    const report = await audit({ cwd: path.join(fixtures, "problematic") });
    const html = renderHtml(report);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain(`SEO health report`);
    expect(html).toContain(`${report.score}`);
    expect(html).toContain("title.missing");
    expect(html).toContain("Search issue or URL");
    expect(html).toContain("Results are shown 30 URLs at a time");
    expect(html).not.toContain('id="page-size"');
    expect(html).toContain("View affected URLs");
    expect(html).toContain("<th>Score</th>");
    expect(html).toContain("Generated locally by Astro SEO Audit");
    expect(html).toContain('href="https://x.com/namanlabs"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders a paginated dashboard shell instead of a thousand static rows", async () => {
    const report = await audit({ cwd: path.join(fixtures, "problematic") });
    const sample = report.pages[0];
    expect(sample).toBeDefined();
    const html = renderHtml({
      ...report,
      pagesScanned: 1000,
      pages: Array.from({ length: 1000 }, (_, index) => ({
        ...sample!,
        path: `/generated/${index}/`,
      })),
    });

    expect(html).toContain('<tbody id="page-rows"></tbody>');
    expect(html.match(/<tr>/g)).toHaveLength(1);
    expect(html).toContain(`var pageSize = ${DASHBOARD_PAGE_SIZE}`);
    expect(html).toContain('id="prev-page"');
    expect(html).toContain('id="page-numbers"');
    expect(html).toContain('id="next-page"');
    expect(html).toContain("/generated/999/");
  });

  it("uses compact numbered pagination at the beginning, middle, and end", () => {
    expect(paginationItems(0, 1)).toEqual([]);
    expect(paginationItems(3, 1)).toEqual([1, 2, 3]);
    expect(paginationItems(100, 1)).toEqual([1, 2, 3, 4, 5, "ellipsis", 100]);
    expect(paginationItems(100, 50)).toEqual([1, "ellipsis", 49, 50, 51, "ellipsis", 100]);
    expect(paginationItems(100, 100)).toEqual([1, "ellipsis", 96, 97, 98, 99, 100]);
  });

  it("escapes audited values before embedding dashboard data", async () => {
    const report = await audit({ cwd: path.join(fixtures, "problematic") });
    const finding = report.findings[0];
    expect(finding).toBeDefined();
    const unsafeFinding = { ...finding!, evidence: "</script><script>alert('xss')</script>" };
    const html = renderHtml({
      ...report,
      findings: [unsafeFinding],
      pages: report.pages.map((page) => ({
        ...page,
        findings: page.path === finding!.path ? [unsafeFinding] : [],
      })),
    });

    expect(html).not.toContain("</script><script>alert('xss')</script>");
    expect(html).toContain("\\u003c/script\\u003e");
  });
});
