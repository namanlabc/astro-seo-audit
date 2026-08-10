import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { audit } from "../src/audit.js";
import { renderHtml } from "../src/reporters/html.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("HTML reporter", () => {
  it("creates a standalone human-readable report", async () => {
    const report = await audit({ cwd: path.join(fixtures, "problematic") });
    const html = renderHtml(report);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain(`SEO health report`);
    expect(html).toContain(`${report.score}`);
    expect(html).toContain("title.missing");
    expect(html).toContain("Generated locally by Astro SEO Audit");
  });
});
