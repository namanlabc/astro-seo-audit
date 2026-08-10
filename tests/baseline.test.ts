import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
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

describe("baselines", () => {
  it("suppresses known findings and fails only for new regressions", async () => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), "astro-seo-audit-"));
    const baseline = path.join(temporary, "baseline.json");
    const cwd = path.join(fixtures, "problematic");

    const writer = io(cwd);
    expect(await runCli(["--write-baseline", baseline], writer.adapter)).toBe(0);

    const known = io(cwd);
    expect(
      await runCli(
        ["--baseline", baseline, "--fail-on", "info", "--format", "json"],
        known.adapter,
      ),
    ).toBe(0);
    const knownReport = JSON.parse(known.stdout.join("")) as {
      baseline: { newFindings: unknown[]; knownFindings: number };
    };
    expect(knownReport.baseline.newFindings).toHaveLength(0);
    expect(knownReport.baseline.knownFindings).toBeGreaterThan(0);

    const saved = JSON.parse(await readFile(baseline, "utf8")) as { findings: string[] };
    saved.findings.pop();
    await writeFile(baseline, JSON.stringify(saved), "utf8");

    const regression = io(cwd);
    expect(
      await runCli(
        ["--baseline", baseline, "--fail-on", "info", "--format", "json"],
        regression.adapter,
      ),
    ).toBe(1);
    const regressionReport = JSON.parse(regression.stdout.join("")) as {
      baseline: { newFindings: unknown[] };
    };
    expect(regressionReport.baseline.newFindings).toHaveLength(1);
  });
});
