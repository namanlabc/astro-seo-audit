import { readFile, stat } from "node:fs/promises";
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

export async function discoverPage(
  buildDir: string,
  config: AuditConfig,
  target: string,
): Promise<NormalizedPage> {
  const candidates = pageTargetFileCandidates(target, config.site);
  for (const relativeFilePath of candidates) {
    const filePath = path.resolve(buildDir, relativeFilePath);
    if (!isWithinDirectory(filePath, buildDir)) continue;
    try {
      if (!(await stat(filePath)).isFile()) continue;
    } catch {
      continue;
    }
    const route = routeWithPolicy(htmlFileToRoute(relativeFilePath), config.trailingSlash);
    return parseHtmlPage({
      html: await readFile(filePath, "utf8"),
      filePath,
      relativeFilePath,
      route,
      kind: htmlFileKind(relativeFilePath),
      url: absolutePageUrl(config.site, route),
    });
  }

  throw new Error(
    `Generated page not found for ${target}. Build the route first or check --page and --dir.`,
  );
}

export function pageTargetFileCandidates(target: string, site?: string): string[] {
  const value = target.trim();
  if (!value) throw new Error("--page requires a route or absolute URL.");

  let url: URL;
  try {
    url = new URL(value, "https://audit.invalid");
  } catch {
    throw new Error(`Invalid --page value: ${target}`);
  }
  if (!/^https?:$/i.test(url.protocol)) {
    throw new Error("--page must be a route or an HTTP(S) URL.");
  }
  if (/^https?:\/\//i.test(value) && site) {
    const configuredOrigin = new URL(site).origin;
    if (url.origin !== configuredOrigin) {
      throw new Error(`--page URL must use the configured site origin: ${configuredOrigin}`);
    }
  }

  const pathname = decodePathname(url.pathname);
  if (pathname === "/") return ["index.html"];
  const relative = pathname.replace(/^\/+|\/+$/g, "");
  if (!relative || relative.split("/").includes("..")) {
    throw new Error(`Invalid --page route: ${target}`);
  }
  if (/\.html$/i.test(relative)) {
    return [relative, `${relative.slice(0, -5)}/index.html`];
  }
  return [`${relative}/index.html`, `${relative}.html`];
}

function decodePathname(pathname: string): string {
  try {
    return decodeURI(pathname).replace(/\/+/g, "/");
  } catch {
    throw new Error("--page contains malformed URL encoding.");
  }
}

function isWithinDirectory(filePath: string, directory: string): boolean {
  const relative = path.relative(path.resolve(directory), filePath);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
