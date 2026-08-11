import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { audit } from "../src/audit.js";
import { renderTerminal } from "../src/reporters/terminal.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("terminal reporter", () => {
  it("keeps a thousand-page report condensed", async () => {
    const report = await audit({ cwd: path.join(fixtures, "problematic") });
    const affected = report.pages.find((page) => page.findings.length > 0);
    expect(affected).toBeDefined();
    const largeReport = {
      ...report,
      pagesScanned: 1000,
      pages: Array.from({ length: 1000 }, (_, index) => ({
        ...affected!,
        path: `/bulk/${index}/`,
      })),
    };

    const output = renderTerminal(largeReport, { color: false });
    expect(output.match(/^\/bulk\/\d+\//gm)).toHaveLength(10);
    expect(output).toContain("… 990 more affected pages.");
    expect(output).toContain("Open the searchable report:");
    expect(output.length).toBeLessThan(12000);
  });
});
