import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { audit, VERSION } from "../audit.js";
import { writeBaseline } from "../baseline.js";
import { renderHtml } from "../reporters/html.js";
import { renderJson } from "../reporters/json.js";
import { renderSarif } from "../reporters/sarif.js";
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
  platform?: NodeJS.Platform;
}

export async function runCli(
  args: string[],
  io: CliIo = {
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
    cwd: process.cwd(),
    env: process.env,
    isTTY: Boolean(process.stdout.isTTY),
    platform: process.platform,
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
      baseline: options.baseline,
      config: options.failOn ? { failOn: options.failOn } : undefined,
    });
    if (options.writeBaseline) {
      const target = await writeBaseline(report, io.cwd, options.writeBaseline);
      io.stdout(`SEO baseline written to ${path.relative(io.cwd, target) || target}\n`);
      return 0;
    }
    const output =
      options.format === "json"
        ? renderJson(report)
        : options.format === "html"
          ? renderHtml(report)
          : options.format === "sarif"
            ? renderSarif(report)
            : renderTerminal(report, { color, quiet: options.quiet });
    if (options.output) {
      const target = path.resolve(io.cwd, options.output);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, output, "utf8");
      if (!options.quiet) {
        io.stdout(`SEO report written to ${options.output}\n`);
        if (options.format === "html") {
          io.stdout(`Open it now: ${openReportCommand(options.output, io.platform)}\n`);
        }
      }
    } else {
      io.stdout(output);
    }

    const effectiveThreshold = options.failOn ?? report.failOn;
    if (
      effectiveThreshold !== "none" &&
      hasQualifyingFinding(report.baseline?.newFindings ?? report.findings, effectiveThreshold)
    ) {
      return 1;
    }
    return 0;
  } catch (error) {
    io.stderr(`Astro SEO Audit: ${error instanceof Error ? error.message : String(error)}\n`);
    return 2;
  }
}

function openReportCommand(output: string, platform = process.platform): string {
  if (platform === "win32") {
    const windowsPath = output.replaceAll("/", "\\");
    const target = path.win32.isAbsolute(windowsPath) ? windowsPath : `.\\${windowsPath}`;
    return `start ${quoteCommandPath(target)}`;
  }

  const target = path.isAbsolute(output) ? output : `./${output}`;
  const command = platform === "darwin" ? "open" : "xdg-open";
  return `${command} ${quoteCommandPath(target)}`;
}

function quoteCommandPath(value: string): string {
  return /\s/.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}

function hasQualifyingFinding(
  findings: Array<{ severity: Severity }>,
  threshold: Severity,
): boolean {
  return findings.some((item) => severityAtOrAbove(item.severity, threshold));
}
