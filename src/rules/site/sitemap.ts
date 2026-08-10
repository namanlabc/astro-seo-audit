import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { SiteRule } from "../../types/index.js";
import { routeCandidates } from "../../utils/urls.js";
import { finding } from "../helpers.js";

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

export const sitemapRules: SiteRule[] = [
  {
    meta: {
      id: "sitemap.missing",
      name: "Missing sitemap",
      category: "sitemap",
      defaultSeverity: "info",
      description: "No generated sitemap XML file was found.",
      help: "A sitemap is optional, but can help discovery and monitoring for larger sites.",
      scope: "site",
    },
    async evaluate(context) {
      const files = await sitemapFiles(context.buildDir);
      return files.length === 0
        ? [
            finding(
              this.meta,
              context.config,
              "No sitemap*.xml file was found in the build output.",
            ),
          ]
        : [];
    },
  },
  {
    meta: {
      id: "sitemap.malformed",
      name: "Malformed sitemap",
      category: "sitemap",
      defaultSeverity: "error",
      description: "A generated sitemap cannot be parsed as XML.",
      help: "Fix or regenerate the sitemap XML.",
      scope: "site",
    },
    async evaluate(context) {
      const files = await sitemapFiles(context.buildDir);
      const results = [];
      for (const file of files) {
        try {
          const xml = await readFile(path.join(context.buildDir, file), "utf8");
          assertValidXml(xml);
          parser.parse(xml);
        } catch (error) {
          results.push(
            finding(this.meta, context.config, `${file} could not be parsed.`, undefined, {
              evidence: error instanceof Error ? error.message : "Invalid XML",
            }),
          );
        }
      }
      return results;
    },
  },
  {
    meta: {
      id: "sitemap.page-missing",
      name: "Indexable page missing from sitemap",
      category: "sitemap",
      defaultSeverity: "warning",
      description: "A generated indexable page is not listed in the generated sitemap.",
      help: "Add the page to the sitemap or confirm that its omission is intentional.",
      scope: "site",
    },
    async evaluate(context) {
      const files = await sitemapFiles(context.buildDir);
      if (files.length === 0) return [];
      const sitemapRoutes = new Set<string>();
      let parsedAny = false;
      for (const file of files) {
        try {
          const xml = await readFile(path.join(context.buildDir, file), "utf8");
          assertValidXml(xml);
          const document = parser.parse(xml) as unknown;
          for (const location of extractLocations(document, "urlset")) {
            try {
              const pathname = new URL(location).pathname;
              routeCandidates(pathname).forEach((candidate) => sitemapRoutes.add(candidate));
              parsedAny = true;
            } catch {
              // Malformed entries are reported separately.
            }
          }
        } catch {
          // Parsing failures are reported by sitemap.malformed.
        }
      }
      if (!parsedAny) return [];
      return context.pages
        .filter(
          (page) =>
            page.indexable &&
            !routeCandidates(page.route).some((candidate) => sitemapRoutes.has(candidate)),
        )
        .map((page) =>
          finding(
            this.meta,
            context.config,
            `${page.route} is not listed in the sitemap.`,
            undefined,
            {
              relatedPaths: [page.route],
            },
          ),
        );
    },
  },
  {
    meta: {
      id: "sitemap.url-malformed",
      name: "Malformed sitemap URL",
      category: "sitemap",
      defaultSeverity: "error",
      description: "A sitemap URL entry is not a valid absolute HTTP(S) URL.",
      help: "Emit absolute, valid HTTP(S) locations in sitemap <loc> values.",
      scope: "site",
    },
    async evaluate(context) {
      const files = await sitemapFiles(context.buildDir);
      const results = [];
      for (const file of files) {
        try {
          const xml = await readFile(path.join(context.buildDir, file), "utf8");
          assertValidXml(xml);
          const document = parser.parse(xml) as unknown;
          for (const location of extractLocations(document, "urlset")) {
            try {
              const url = new URL(location);
              if (!["http:", "https:"].includes(url.protocol)) throw new Error("Non-HTTP URL");
            } catch {
              results.push(
                finding(this.meta, context.config, `Malformed URL in ${file}.`, undefined, {
                  evidence: location,
                }),
              );
            }
          }
        } catch {
          // Parsing failures are reported by sitemap.malformed.
        }
      }
      return results;
    },
  },
];

async function sitemapFiles(buildDir: string): Promise<string[]> {
  return fg(["sitemap*.xml", "**/sitemap*.xml"], {
    cwd: buildDir,
    onlyFiles: true,
    unique: true,
  });
}

function extractLocations(value: unknown, root: "urlset" | "sitemapindex"): string[] {
  if (typeof value !== "object" || value === null) return [];
  const document = value as Record<string, unknown>;
  const rootValue = document[root];
  if (typeof rootValue !== "object" || rootValue === null) return [];
  const records = rootValue as Record<string, unknown>;
  const entries = records[root === "urlset" ? "url" : "sitemap"];
  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
  return list.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const location = (entry as Record<string, unknown>).loc;
    return typeof location === "string" ? [location.trim()] : [];
  });
}

function assertValidXml(xml: string): void {
  const result = XMLValidator.validate(xml);
  if (result !== true) throw new Error(result.err.msg);
}
