import path from "node:path";
import fg from "fast-glob";

export async function discoverSourceHints(projectRoot: string): Promise<Map<string, string>> {
  const files = await fg("src/pages/**/*.{astro,md,mdx,html}", {
    cwd: projectRoot,
    onlyFiles: true,
    unique: true,
  });
  const hints = new Map<string, string>();
  for (const file of files.sort()) {
    const relative = path.posix.normalize(file.replaceAll(path.sep, "/"));
    const pagePath = relative.replace(/^src\/pages\//, "").replace(/\.(astro|md|mdx|html)$/i, "");
    if (pagePath.split("/").some((segment) => segment.includes("["))) continue;
    const withoutIndex = pagePath === "index" ? "" : pagePath.replace(/\/index$/, "");
    const route = normalizeRoute(`/${withoutIndex}`);
    if (!hints.has(route)) hints.set(route, relative);
  }
  return hints;
}

export function normalizeSourceHintRoute(route: string): string {
  return normalizeRoute(route);
}

function normalizeRoute(route: string): string {
  const normalized = `/${route}`.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return normalized || "/";
}
