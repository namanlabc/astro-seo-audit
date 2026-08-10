import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { audit } from "../src/audit.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("site audit", () => {
  it("audits a healthy generated Astro site without findings", async () => {
    const report = await audit({ cwd: path.join(fixtures, "healthy") });
    expect(report.pagesScanned).toBe(4);
    expect(report.summary.errors).toBe(0);
    expect(report.summary.warnings).toBe(0);
    expect(report.summary.info).toBe(0);
    expect(report.score).toBe(100);
    expect(report.project.astroDetected).toBe(true);
    expect(report.project.trailingSlash).toBe("always");
    expect(report.pages.find((page) => page.file === "404.html")).toMatchObject({
      kind: "not-found",
      indexable: false,
    });
  });

  it("audits exactly one generated page without site-wide checks", async () => {
    const report = await audit({
      cwd: path.join(fixtures, "healthy"),
      page: "/about/",
    });

    expect(report).toMatchObject({
      mode: "page",
      requestedPage: "/about/",
      pagesScanned: 1,
      score: 100,
    });
    expect(report.pages).toHaveLength(1);
    expect(report.pages[0]).toMatchObject({
      path: "/about/",
      file: "about/index.html",
    });
    expect(report.siteFindings).toEqual([]);
    expect(report.sitePassedRules).toEqual([]);
  });

  it("accepts a same-origin absolute URL as a page target", async () => {
    const report = await audit({
      cwd: path.join(fixtures, "healthy"),
      page: "https://example.com/guides/getting-started/",
    });

    expect(report.pages).toHaveLength(1);
    expect(report.pages[0]?.file).toBe("guides/getting-started/index.html");
  });

  it("finds page-level and site-wide problems from final HTML", async () => {
    const report = await audit({ cwd: path.join(fixtures, "problematic") });
    const ids = report.findings.map((finding) => finding.ruleId);

    expect(ids).toEqual(
      expect.arrayContaining([
        "title.missing",
        "title.duplicate",
        "canonical.multiple",
        "robots.noindex",
        "robots.conflicting",
        "images.alt-missing",
        "links.broken-internal",
        "links.malformed-internal",
        "links.orphan-page",
        "schema.invalid-json",
        "sitemap.malformed",
        "sitemap.page-missing",
        "sitemap.url-malformed",
        "robots-txt.full-site-block",
      ]),
    );
    expect(report.summary.errors).toBeGreaterThan(0);
    expect(report.score).toBeLessThan(100);
  });

  it("supports ignored rules and severity overrides", async () => {
    const report = await audit({
      cwd: path.join(fixtures, "problematic"),
      config: {
        ignoredRules: ["title.missing"],
        severityOverrides: { "links.broken-internal": "info" },
      },
    });
    expect(report.findings.some((finding) => finding.ruleId === "title.missing")).toBe(false);
    expect(
      report.findings
        .filter((finding) => finding.ruleId === "links.broken-internal")
        .every((finding) => finding.severity === "info"),
    ).toBe(true);
  });
});
