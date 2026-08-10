import type { SiteRule } from "../../types/index.js";
import { duplicateRules } from "./duplicates.js";
import { linkRules } from "./links.js";
import { robotsRules } from "./robots.js";
import { sitemapRules } from "./sitemap.js";

export const siteRules: SiteRule[] = [
  ...duplicateRules,
  ...linkRules,
  ...sitemapRules,
  ...robotsRules,
];
