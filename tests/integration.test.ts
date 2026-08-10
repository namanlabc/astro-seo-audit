import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import astroSeoAudit from "../src/integration.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
type Hook = (input: never) => unknown;

describe("Astro integration", () => {
  it("audits Astro's completed build directory and writes a report", async () => {
    const fixture = path.join(fixtures, "healthy");
    const temporary = await mkdtemp(path.join(os.tmpdir(), "astro-seo-integration-"));
    const output = path.join(temporary, "report.json");
    const integration = astroSeoAudit({ output, format: "json", failOn: "error" });
    const configDone = integration.hooks["astro:config:done"] as Hook;
    const buildDone = integration.hooks["astro:build:done"] as Hook;

    await configDone({ config: { root: pathToFileURL(`${fixture}/`) } } as never);
    await buildDone({
      dir: pathToFileURL(`${path.join(fixture, "dist")}/`),
      logger: { info: () => undefined },
    } as never);

    const report = JSON.parse(await readFile(output, "utf8")) as Record<string, unknown>;
    expect(report).toMatchObject({ version: "0.3.0", score: 100, pagesScanned: 4 });
  });
});
