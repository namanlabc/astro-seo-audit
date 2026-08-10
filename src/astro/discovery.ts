import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectInfo } from "../types/index.js";

const astroConfigNames = [
  "astro.config.mjs",
  "astro.config.js",
  "astro.config.ts",
  "astro.config.mts",
  "astro.config.cjs",
];

interface StaticAstroSettings {
  site?: string;
  outDir?: string;
  trailingSlash?: ProjectInfo["trailingSlash"];
}

export async function discoverProject(cwd: string, explicitDir?: string): Promise<ProjectInfo> {
  const projectRoot = path.resolve(cwd);
  const configPath = await firstExisting(
    astroConfigNames.map((name) => path.join(projectRoot, name)),
  );
  const packageJson = await readJson(path.join(projectRoot, "package.json"));
  const astroDetected = Boolean(configPath) || hasAstroDependency(packageJson);
  const staticSettings = configPath
    ? parseAstroConfigStatically(await readFile(configPath, "utf8"))
    : {};
  const configuredBuildDir = staticSettings.outDir
    ? path.resolve(projectRoot, staticSettings.outDir)
    : path.join(projectRoot, "dist");

  return {
    projectRoot,
    buildDir: explicitDir ? path.resolve(projectRoot, explicitDir) : configuredBuildDir,
    site: staticSettings.site,
    trailingSlash: staticSettings.trailingSlash ?? "ignore",
    astroDetected,
    configPath,
  };
}

export function parseAstroConfigStatically(source: string): StaticAstroSettings {
  const result: StaticAstroSettings = {};
  const site = source.match(/\bsite\s*:\s*(["'`])([^"'`]+)\1/);
  const trailingSlash = source.match(/\btrailingSlash\s*:\s*(["'])(always|never|ignore)\1/);
  const simpleOutDir = source.match(/\boutDir\s*:\s*(["'`])([^"'`]+)\1/);
  const urlOutDir = source.match(
    /\boutDir\s*:\s*new\s+URL\(\s*(["'`])\.\/?([^"'`]+)\1\s*,\s*import\.meta\.url\s*\)/,
  );
  if (site?.[2]) result.site = site[2];
  if (trailingSlash?.[2]) result.trailingSlash = trailingSlash[2] as ProjectInfo["trailingSlash"];
  if (simpleOutDir?.[2]) result.outDir = simpleOutDir[2];
  else if (urlOutDir?.[2]) result.outDir = urlOutDir[2];
  return result;
}

async function firstExisting(paths: string[]): Promise<string | undefined> {
  for (const candidate of paths) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue without importing or executing the user's Astro config.
    }
  }
  return undefined;
}

async function readJson(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as unknown;
  } catch {
    return undefined;
  }
}

function hasAstroDependency(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const packageJson = value as Record<string, unknown>;
  return [packageJson.dependencies, packageJson.devDependencies].some(
    (group) => typeof group === "object" && group !== null && "astro" in group,
  );
}
