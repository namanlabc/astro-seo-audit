import type { PageRule } from "../../types/index.js";
import { normalizeComparableUrl } from "../../utils/urls.js";
import { finding } from "../helpers.js";

export const canonicalRules: PageRule[] = [
  {
    meta: {
      id: "canonical.missing",
      name: "Missing canonical",
      category: "canonical",
      defaultSeverity: "warning",
      description: "No canonical link is present.",
      help: "Consider declaring the preferred absolute URL for indexable pages.",
      scope: "page",
    },
    evaluate(page, context) {
      return page.indexable && page.canonicals.length === 0
        ? [finding(this.meta, context.config, "Indexable page has no canonical link.", page)]
        : [];
    },
  },
  {
    meta: {
      id: "canonical.multiple",
      name: "Multiple canonicals",
      category: "canonical",
      defaultSeverity: "error",
      description: "More than one canonical link is rendered.",
      help: "Render one canonical link in the final document.",
      scope: "page",
    },
    evaluate(page, context) {
      return page.canonicals.length > 1
        ? [
            finding(
              this.meta,
              context.config,
              `Page contains ${page.canonicals.length} canonical links.`,
              page,
            ),
          ]
        : [];
    },
  },
  {
    meta: {
      id: "canonical.empty",
      name: "Empty canonical",
      category: "canonical",
      defaultSeverity: "error",
      description: "The canonical link has an empty href.",
      help: "Set the canonical href to a valid absolute HTTP(S) URL.",
      scope: "page",
    },
    evaluate(page, context) {
      return page.canonicals.some((canonical) => canonical.length === 0)
        ? [finding(this.meta, context.config, "Page contains an empty canonical href.", page)]
        : [];
    },
  },
  {
    meta: {
      id: "canonical.relative",
      name: "Relative canonical",
      category: "canonical",
      defaultSeverity: "warning",
      description: "The canonical is not an absolute URL.",
      help: "Use an absolute HTTP(S) canonical URL to make the preferred URL explicit.",
      scope: "page",
    },
    evaluate(page, context) {
      const relative = page.canonicals.find(
        (canonical) => canonical && !/^https?:\/\//i.test(canonical),
      );
      return relative
        ? [
            finding(this.meta, context.config, "Canonical is relative.", page, {
              evidence: relative,
            }),
          ]
        : [];
    },
  },
  {
    meta: {
      id: "canonical.malformed",
      name: "Malformed canonical",
      category: "canonical",
      defaultSeverity: "error",
      description: "The absolute canonical cannot be parsed or uses a non-HTTP protocol.",
      help: "Use a valid absolute HTTP(S) URL.",
      scope: "page",
    },
    evaluate(page, context) {
      const malformed = page.canonicals.find((canonical) => {
        if (!/^https?:\/\//i.test(canonical)) return false;
        try {
          const url = new URL(canonical);
          return !url.hostname;
        } catch {
          return true;
        }
      });
      return malformed
        ? [
            finding(this.meta, context.config, "Canonical is malformed.", page, {
              evidence: malformed,
            }),
          ]
        : [];
    },
  },
  {
    meta: {
      id: "canonical.inconsistent",
      name: "Canonical path mismatch",
      category: "canonical",
      defaultSeverity: "warning",
      description: "A same-origin canonical points to a different page path.",
      help: "Confirm that this cross-canonical is intentional. Different-origin canonicals are not guessed at.",
      scope: "page",
    },
    evaluate(page, context) {
      if (!page.indexable || !page.url || page.canonicals.length !== 1) return [];
      const pageUrl = normalizeComparableUrl(page.url);
      const canonical = normalizeComparableUrl(page.canonicals[0] ?? "");
      if (!pageUrl || !canonical) return [];
      const expectedOrigin = new URL(pageUrl).origin;
      const canonicalOrigin = new URL(canonical).origin;
      if (expectedOrigin !== canonicalOrigin || pageUrl === canonical) return [];
      return [
        finding(
          this.meta,
          context.config,
          "Same-origin canonical points to a different page path.",
          page,
          { evidence: page.canonicals[0] },
        ),
      ];
    },
  },
];
