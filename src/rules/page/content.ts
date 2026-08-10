import type { PageRule } from "../../types/index.js";
import { finding } from "../helpers.js";

export const contentRules: PageRule[] = [
  {
    meta: {
      id: "robots.noindex",
      name: "Noindex directive",
      category: "indexability",
      defaultSeverity: "info",
      description: "The page asks compliant crawlers not to index it.",
      help: "Noindex can be intentional. Verify that this page should be excluded from search.",
      scope: "page",
    },
    evaluate(page, context) {
      return page.robotsDirectives.includes("noindex")
        ? [finding(this.meta, context.config, "Page contains a noindex directive.", page)]
        : [];
    },
  },
  {
    meta: {
      id: "robots.conflicting",
      name: "Conflicting robots directives",
      category: "indexability",
      defaultSeverity: "warning",
      description: "The page contains contradictory robots directives.",
      help: "Remove conflicting index/noindex or follow/nofollow values so crawler intent is clear.",
      scope: "page",
    },
    evaluate(page, context) {
      const values = new Set(page.robotsDirectives);
      const conflict =
        (values.has("index") && values.has("noindex")) ||
        (values.has("follow") && values.has("nofollow"));
      return conflict
        ? [finding(this.meta, context.config, "Page has conflicting robots directives.", page)]
        : [];
    },
  },
  {
    meta: {
      id: "robots.nofollow",
      name: "Nofollow directive",
      category: "indexability",
      defaultSeverity: "info",
      description: "The page asks crawlers not to follow its links.",
      help: "Verify that nofollow is intentional for the whole page.",
      scope: "page",
    },
    evaluate(page, context) {
      return page.robotsDirectives.includes("nofollow")
        ? [finding(this.meta, context.config, "Page contains a nofollow directive.", page)]
        : [];
    },
  },
  {
    meta: {
      id: "headings.h1-missing",
      name: "Missing H1",
      category: "headings",
      defaultSeverity: "warning",
      description: "The page has no level-one heading.",
      help: "Consider adding a clear primary heading that describes the page content.",
      scope: "page",
    },
    evaluate(page, context) {
      return page.h1s.length === 0
        ? [finding(this.meta, context.config, "Page has no H1 heading.", page)]
        : [];
    },
  },
  {
    meta: {
      id: "headings.h1-multiple",
      name: "Multiple H1 headings",
      category: "headings",
      defaultSeverity: "info",
      description: "The page contains multiple level-one headings.",
      help: "Multiple H1s are valid HTML and not inherently harmful. Review whether the document hierarchy is clear.",
      scope: "page",
    },
    evaluate(page, context) {
      return page.h1s.length > 1
        ? [
            finding(
              this.meta,
              context.config,
              `Page contains ${page.h1s.length} H1 headings.`,
              page,
            ),
          ]
        : [];
    },
  },
  {
    meta: {
      id: "images.alt-missing",
      name: "Missing image alt attribute",
      category: "images",
      defaultSeverity: "warning",
      description: "One or more images have no alt attribute.",
      help: 'Add useful alt text for meaningful images or alt="" for decorative images. Empty alt attributes are intentionally not flagged.',
      scope: "page",
    },
    evaluate(page, context) {
      const missing = page.images.filter((image) => image.alt === null);
      return missing.length
        ? [
            finding(
              this.meta,
              context.config,
              `${missing.length} image${missing.length === 1 ? " is" : "s are"} missing an alt attribute.`,
              page,
              {
                evidence: missing
                  .slice(0, 3)
                  .map((image) => image.src || "<empty src>")
                  .join(", "),
              },
            ),
          ]
        : [];
    },
  },
];
