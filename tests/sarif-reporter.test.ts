import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { audit } from "../src/audit.js";
import { renderSarif } from "../src/reporters/sarif.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("SARIF reporter", () => {
  it("creates GitHub Code Scanning compatible results", async () => {
    const report = await audit({ cwd: path.join(fixtures, "problematic") });
    const sarif = JSON.parse(renderSarif(report)) as {
      version: string;
      runs: Array<{ results: Array<{ ruleId: string }> }>;
    };
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0]?.results.some((result) => result.ruleId === "title.missing")).toBe(true);
  });
});
