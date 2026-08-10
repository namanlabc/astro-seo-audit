import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli/run.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

function io(cwd: string) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    adapter: {
      stdout: (value: string) => stdout.push(value),
      stderr: (value: string) => stderr.push(value),
      cwd,
      env: {},
      isTTY: false,
    },
  };
}

describe("CLI", () => {
  it("prints structured JSON", async () => {
    const output = io(path.join(fixtures, "healthy"));
    expect(await runCli(["--format", "json"], output.adapter)).toBe(0);
    const report = JSON.parse(output.stdout.join("")) as Record<string, unknown>;
    expect(report).toMatchObject({
      mode: "site",
      score: 100,
      pagesScanned: 4,
      version: "0.3.0",
    });
    expect(report.pages).toBeInstanceOf(Array);
    expect(report.siteFindings).toBeInstanceOf(Array);
  });

  it("prints a structured page-only JSON report", async () => {
    const output = io(path.join(fixtures, "healthy"));
    expect(await runCli(["--page", "/about/", "--format", "json"], output.adapter)).toBe(0);
    const report = JSON.parse(output.stdout.join("")) as Record<string, unknown>;
    expect(report).toMatchObject({
      mode: "page",
      requestedPage: "/about/",
      score: 100,
      pagesScanned: 1,
      version: "0.3.0",
      siteFindings: [],
      sitePassedRules: [],
    });
  });

  it("explains that site-wide checks are skipped in page mode", async () => {
    const output = io(path.join(fixtures, "healthy"));
    expect(await runCli(["--page", "/about/", "--no-color"], output.adapter)).toBe(0);
    expect(output.stdout.join("")).toContain("Page-only audit. Site-wide checks were skipped.");
    expect(output.stdout.join("")).toContain("Page result");
  });

  it("returns a usage error when the generated page does not exist", async () => {
    const output = io(path.join(fixtures, "healthy"));
    expect(await runCli(["--page", "/missing/"], output.adapter)).toBe(2);
    expect(output.stderr.join("")).toContain("Generated page not found for /missing/");
  });

  it("returns non-zero when the fail threshold is met", async () => {
    const output = io(path.join(fixtures, "problematic"));
    expect(await runCli(["--quiet", "--fail-on", "error"], output.adapter)).toBe(1);
    expect(output.stdout.join("")).toContain("Completed with");
  });

  it("returns a usage error for an unknown flag", async () => {
    const output = io(path.join(fixtures, "healthy"));
    expect(await runCli(["--wat"], output.adapter)).toBe(2);
    expect(output.stderr.join("")).toContain("Unknown option");
  });

  it("prints help without auditing", async () => {
    const output = io("/does/not/exist");
    expect(await runCli(["--help"], output.adapter)).toBe(0);
    expect(output.stdout.join("")).toContain("--fail-on");
    expect(output.stdout.join("")).toContain("--page");
    expect(output.stdout.join("")).toContain("--baseline");
  });

  it("writes an HTML report based on the output extension", async () => {
    const output = io(path.join(fixtures, "healthy"));
    const target = path.join(
      await import("node:os").then((module) => module.tmpdir()),
      "astro-seo-audit-test.html",
    );
    expect(await runCli(["--output", target], output.adapter)).toBe(0);
    expect(output.stdout.join("")).toContain("SEO report written");
  });
});
