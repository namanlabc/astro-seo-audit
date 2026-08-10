import { writeFile } from "node:fs/promises";
import path from "node:path";
import { audit, VERSION } from "../audit.js";
import { renderJson } from "../reporters/json.js";
import { renderTerminal } from "../reporters/terminal.js";
import { severityAtOrAbove } from "../rules/helpers.js";
import type { Severity } from "../types/index.js";
import { parseArgs } from "./args.js";
import { helpText } from "./help.js";

export interface CliIo {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
  cwd: string;
  env: NodeJS.ProcessEnv;
  isTTY: boolean;
}

export async function runCli(
  args: string[],
  io: CliIo = {
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
    cwd: process.cwd(),
    env: process.env,
    isTTY: Boolean(process.stdout.isTTY),
  },
): Promise<number> {
  try {
    const options = parseArgs(args);
    if (options.help) {
      io.stdout(helpText);
      return 0;
    }
    if (options.version) {
      io.stdout(`${VERSION}\n`);
      return 0;
    }

    const color = options.color && io.env.NO_COLOR === undefined && io.isTTY;
    const report = await audit({
      cwd: io.cwd,
      dir: options.dir,
      page: options.page,
      config: options.failOn ? { failOn: options.failOn } : undefined,
    });
    const output =
      options.format === "json"
        ? renderJson(report)
        : renderTerminal(report, { color, quiet: options.quiet });
    if (options.output) {
      await writeFile(path.resolve(io.cwd, options.output), renderJson(report), "utf8");
      if (!options.quiet) io.stdout(`SEO report written to ${options.output}\n`);
    } else {
      io.stdout(output);
    }

    const effectiveThreshold = options.failOn ?? report.failOn;
    if (
      effectiveThreshold !== "none" &&
      hasQualifyingFinding(report.findings, effectiveThreshold)
    ) {
      return 1;
    }
    return 0;
  } catch (error) {
    io.stderr(`Astro SEO Audit: ${error instanceof Error ? error.message : String(error)}\n`);
    return 2;
  }
}

function hasQualifyingFinding(
  findings: Array<{ severity: Severity }>,
  threshold: Severity,
): boolean {
  return findings.some((item) => severityAtOrAbove(item.severity, threshold));
}
