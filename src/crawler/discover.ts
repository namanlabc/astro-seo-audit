import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { AuditConfig, NormalizedPage } from "../types/index.js";
import { parseHtmlPage } from "../parser/html.js";
import { matchesPattern } from "../utils/patterns.js";
import { absolutePageUrl, htmlFileKind, htmlFileToRoute, routeWithPolicy } from "../utils/urls.js";

export async function discoverPages(
  buildDir: string,
  config: AuditConfig,
): Promise<NormalizedPage[]> {
  const relativeFiles = await fg("**/*.html", {
    cwd: buildDir,
    onlyFiles: true,
    dot: false,
    followSymbolicLinks: false,
  });
  const selected = relativeFiles
    .map((relativeFilePath) => ({
      relativeFilePath,
      route: routeWithPolicy(htmlFileToRoute(relativeFilePath), config.trailingSlash),
    }))
    .filter(({ route }) => !matchesPattern(route, config.ignoreRoutes))
    .sort((a, b) => a.route.localeCompare(b.route));

  const pages: NormalizedPage[] = [];
  for (let index = 0; index < selected.length; index += 64) {
    const batch = selected.slice(index, index + 64);
    const parsed = await Promise.all(
      batch.map(async ({ relativeFilePath, route }) => {
        const filePath = path.join(buildDir, relativeFilePath);
        return parseHtmlPage({
          html: await readFile(filePath, "utf8"),
          filePath,
          relativeFilePath,
          route,
          kind: htmlFileKind(relativeFilePath),
          url: absolutePageUrl(config.site, route),
        });
      }),
    );
    pages.push(...parsed);
  }
  return pages;
}
