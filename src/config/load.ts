import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AuditConfig, Severity } from "../types/index.js";

const severities = new Set<Severity>(["error", "warning", "info"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined;
}

export function validateConfig(value: unknown, source = "configuration"): Partial<AuditConfig> {
  if (!isObject(value)) throw new Error(`${source} must contain a JSON object.`);

  const config: Partial<AuditConfig> = {};
  if (typeof value.site === "string") config.site = value.site;
  if (typeof value.buildDir === "string") config.buildDir = value.buildDir;
  if (["always", "never", "ignore"].includes(String(value.trailingSlash))) {
    config.trailingSlash = value.trailingSlash as AuditConfig["trailingSlash"];
  }
  const ignoreRoutes = stringArray(value.ignoreRoutes);
  const orphanExclusions = stringArray(value.orphanExclusions);
  const ignoredRules = stringArray(value.ignoredRules);
  if (ignoreRoutes) config.ignoreRoutes = ignoreRoutes;
  if (orphanExclusions) config.orphanExclusions = orphanExclusions;
  if (ignoredRules) config.ignoredRules = ignoredRules;
  if (isObject(value.severityOverrides)) {
    config.severityOverrides = Object.fromEntries(
      Object.entries(value.severityOverrides).filter(
        (entry): entry is [string, Severity] =>
          typeof entry[1] === "string" && severities.has(entry[1] as Severity),
      ),
    );
  }
  if (isObject(value.titleLength)) {
    const min = numberSetting(value.titleLength.min, "titleLength.min");
    const max = numberSetting(value.titleLength.max, "titleLength.max");
    if (min > max) throw new Error("titleLength.min cannot be greater than titleLength.max.");
    config.titleLength = { min, max };
  }
  if (isObject(value.descriptionLength)) {
    const min = numberSetting(value.descriptionLength.min, "descriptionLength.min");
    const max = numberSetting(value.descriptionLength.max, "descriptionLength.max");
    if (min > max) {
      throw new Error("descriptionLength.min cannot be greater than descriptionLength.max.");
    }
    config.descriptionLength = { min, max };
  }
  if (["error", "warning", "info", "none"].includes(String(value.failOn))) {
    config.failOn = value.failOn as AuditConfig["failOn"];
  }
  return config;
}

function numberSetting(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number.`);
  }
  return value;
}

export async function loadUserConfig(projectRoot: string): Promise<Partial<AuditConfig>> {
  const configPath = path.join(projectRoot, "astro-seo-audit.config.json");
  try {
    const raw = await readFile(configPath, "utf8");
    return validateConfig(JSON.parse(raw) as unknown, configPath);
  } catch (error) {
    if (isMissingFile(error)) return loadPackageConfig(projectRoot);
    if (error instanceof SyntaxError) throw new Error(`${configPath} contains invalid JSON.`);
    throw error;
  }
}

async function loadPackageConfig(projectRoot: string): Promise<Partial<AuditConfig>> {
  const packagePath = path.join(projectRoot, "package.json");
  try {
    const parsed = JSON.parse(await readFile(packagePath, "utf8")) as unknown;
    if (!isObject(parsed) || parsed["astro-seo-audit"] === undefined) return {};
    return validateConfig(parsed["astro-seo-audit"], `${packagePath}#astro-seo-audit`);
  } catch (error) {
    if (isMissingFile(error)) return {};
    if (error instanceof SyntaxError) throw new Error(`${packagePath} contains invalid JSON.`);
    throw error;
  }
}

function isMissingFile(error: unknown): boolean {
  return isObject(error) && error.code === "ENOENT";
}
