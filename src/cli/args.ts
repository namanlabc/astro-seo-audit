import type { Severity } from "../types/index.js";

export interface CliOptions {
  dir?: string;
  page?: string;
  format: "terminal" | "json";
  output?: string;
  color: boolean;
  failOn?: Severity | "none";
  quiet: boolean;
  help: boolean;
  version: boolean;
}

const valueFlags = new Set(["--dir", "--page", "--format", "--output", "--fail-on"]);

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    format: "terminal",
    color: true,
    quiet: false,
    help: false,
    version: false,
  };
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? "";
    const [rawFlag, inlineValue] = splitFlag(argument);
    if (rawFlag === "--help" || rawFlag === "-h") options.help = true;
    else if (rawFlag === "--version" || rawFlag === "-v") options.version = true;
    else if (rawFlag === "--no-color") options.color = false;
    else if (rawFlag === "--quiet" || rawFlag === "-q") options.quiet = true;
    else if (valueFlags.has(rawFlag)) {
      const value = inlineValue ?? args[++index];
      if (!value || value.startsWith("--")) throw new Error(`${rawFlag} requires a value.`);
      if (rawFlag === "--dir") options.dir = value;
      else if (rawFlag === "--page") options.page = value;
      else if (rawFlag === "--output") options.output = value;
      else if (rawFlag === "--format") {
        if (value !== "terminal" && value !== "json") {
          throw new Error("--format must be terminal or json.");
        }
        options.format = value;
      } else if (rawFlag === "--fail-on") {
        if (!["error", "warning", "info", "none"].includes(value)) {
          throw new Error("--fail-on must be error, warning, info, or none.");
        }
        options.failOn = value as Severity | "none";
      }
    } else if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      positionals.push(argument);
    }
  }

  if (positionals.length > 1) throw new Error("Only one build directory may be provided.");
  if (positionals[0]) {
    if (options.dir) throw new Error("Use either a positional directory or --dir, not both.");
    options.dir = positionals[0];
  }
  if (options.output && options.format === "terminal") options.format = "json";
  return options;
}

function splitFlag(argument: string): [string, string | undefined] {
  const index = argument.indexOf("=");
  return index === -1
    ? [argument, undefined]
    : [argument.slice(0, index), argument.slice(index + 1)];
}
