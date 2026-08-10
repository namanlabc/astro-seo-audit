import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { audit } from "./audit.js";
import { renderHtml } from "./reporters/html.js";
import { renderJson } from "./reporters/json.js";
import { renderSarif } from "./reporters/sarif.js";
import { renderTerminal } from "./reporters/terminal.js";
import { severityAtOrAbove } from "./rules/helpers.js";
import type { AuditConfig, ReportFormat, Severity } from "./types/index.js";

export interface AstroSeoAuditOptions {
  enabled?: boolean;
  config?: Partial<AuditConfig>;
  failOn?: Severity | "none";
  baseline?: string;
  format?: ReportFormat;
  output?: string;
}

interface AstroIntegrationContract {
  name: string;
  hooks: {
    "astro:config:done": (input: { config: { root: URL } }) => void;
    "astro:build:done": (input: {
      dir: URL;
      logger: { info: (message: string) => void };
    }) => Promise<void>;
  };
}

export default function astroSeoAudit(
  options: AstroSeoAuditOptions = {},
): AstroIntegrationContract {
  let projectRoot = process.cwd();

  return {
    name: "astro-seo-audit",
    hooks: {
      "astro:config:done": ({ config }) => {
        projectRoot = fileURLToPath(config.root);
      },
      "astro:build:done": async ({ dir, logger }) => {
        if (options.enabled === false || process.env.SKIP_ASTRO_SEO_AUDIT === "1") return;

        const integrationConfig: Partial<AuditConfig> = { ...options.config };
        if (options.failOn !== undefined) integrationConfig.failOn = options.failOn;
        const report = await audit({
          cwd: projectRoot,
          dir: fileURLToPath(dir),
          baseline: options.baseline,
          config: integrationConfig,
        });
        const format = inferFormat(options.format, options.output);
        const rendered = renderReport(report, format);
        if (options.output) {
          const target = path.resolve(projectRoot, options.output);
          await mkdir(path.dirname(target), { recursive: true });
          await writeFile(target, rendered, "utf8");
          logger.info(`SEO report written to ${path.relative(projectRoot, target)}`);
        } else {
          process.stdout.write(rendered);
        }

        const failOn = options.failOn ?? options.config?.failOn ?? report.failOn;
        const findings = report.baseline?.newFindings ?? report.findings;
        const qualifying =
          failOn === "none"
            ? []
            : findings.filter((finding) => severityAtOrAbove(finding.severity, failOn));
        if (qualifying.length > 0) {
          throw new Error(
            `Astro SEO Audit blocked the build: ${qualifying.length} qualifying finding${qualifying.length === 1 ? "" : "s"}.`,
          );
        }
      },
    },
  };
}

function inferFormat(format?: ReportFormat, output?: string): ReportFormat {
  if (format) return format;
  if (output?.toLowerCase().endsWith(".html")) return "html";
  if (output?.toLowerCase().endsWith(".sarif")) return "sarif";
  if (output?.toLowerCase().endsWith(".json")) return "json";
  return "terminal";
}

function renderReport(report: Awaited<ReturnType<typeof audit>>, format: ReportFormat): string {
  if (format === "html") return renderHtml(report);
  if (format === "sarif") return renderSarif(report);
  if (format === "json") return renderJson(report);
  return renderTerminal(report, { color: false });
}
