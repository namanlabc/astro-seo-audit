import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SiteRule } from "../../types/index.js";
import { finding } from "../helpers.js";

interface RobotsGroup {
  agents: string[];
  allow: string[];
  disallow: string[];
}

export const robotsRules: SiteRule[] = [
  {
    meta: {
      id: "robots-txt.missing",
      name: "Missing robots.txt",
      category: "robots",
      defaultSeverity: "info",
      description: "No robots.txt file exists in the generated output.",
      help: "robots.txt is optional. Add one if you need crawl controls or sitemap discovery.",
      scope: "site",
    },
    async evaluate(context) {
      const content = await readRobots(context.buildDir);
      return content === undefined
        ? [finding(this.meta, context.config, "No robots.txt file was found.")]
        : [];
    },
  },
  {
    meta: {
      id: "robots-txt.full-site-block",
      name: "Full-site robots block",
      category: "robots",
      defaultSeverity: "error",
      description: "The wildcard crawler group disallows the entire site.",
      help: "Remove `Disallow: /` before production unless the full-site block is intentional.",
      scope: "site",
    },
    async evaluate(context) {
      const content = await readRobots(context.buildDir);
      if (content === undefined) return [];
      const blocked = parseRobots(content).some(
        (group) => group.agents.includes("*") && group.disallow.includes("/"),
      );
      return blocked
        ? [
            finding(
              this.meta,
              context.config,
              "robots.txt blocks the entire site for User-agent: *.",
            ),
          ]
        : [];
    },
  },
  {
    meta: {
      id: "robots-txt.contradictory",
      name: "Contradictory robots.txt directives",
      category: "robots",
      defaultSeverity: "warning",
      description: "A crawler group allows and disallows the exact same path.",
      help: "Clarify the overlapping rule. Real crawler matching uses specificity, so this check only reports exact contradictions.",
      scope: "site",
    },
    async evaluate(context) {
      const content = await readRobots(context.buildDir);
      if (content === undefined) return [];
      return parseRobots(content)
        .filter((group) => group.allow.some((value) => group.disallow.includes(value)))
        .map((group) => {
          const overlap = group.allow.find((value) => group.disallow.includes(value));
          return finding(
            this.meta,
            context.config,
            `robots.txt both allows and disallows ${overlap} for ${group.agents.join(", ")}.`,
          );
        });
    },
  },
];

async function readRobots(buildDir: string): Promise<string | undefined> {
  try {
    return await readFile(path.join(buildDir, "robots.txt"), "utf8");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export function parseRobots(content: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | undefined;
  let seenRule = false;
  for (const originalLine of content.split(/\r?\n/)) {
    const line = originalLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (!current || seenRule) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
        seenRule = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (!current) continue;
    if (key === "allow") {
      current.allow.push(value);
      seenRule = true;
    } else if (key === "disallow") {
      if (value) current.disallow.push(value);
      seenRule = true;
    }
  }
  return groups;
}
