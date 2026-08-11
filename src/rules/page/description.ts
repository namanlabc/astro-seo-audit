import type { PageRule } from "../../types/index.js";
import { finding } from "../helpers.js";

export const descriptionRules: PageRule[] = [
  {
    meta: {
      id: "description.missing",
      name: "Missing meta description",
      category: "description",
      defaultSeverity: "warning",
      description: "The document has no meta description.",
      help: "Consider adding a useful page summary. Descriptions are not required for indexing and may be rewritten by search engines.",
      scope: "page",
    },
    evaluate(page, context) {
      if (!page.indexable) return [];
      return page.descriptions.length === 0
        ? [finding(this.meta, context.config, "Page has no meta description.", page)]
        : [];
    },
  },
  {
    meta: {
      id: "description.empty",
      name: "Empty meta description",
      category: "description",
      defaultSeverity: "warning",
      description: "A meta description exists but has no content.",
      help: "Add a meaningful summary or remove the empty tag.",
      scope: "page",
    },
    evaluate(page, context) {
      if (!page.indexable) return [];
      return page.descriptions.some((description) => description.length === 0)
        ? [finding(this.meta, context.config, "Page contains an empty meta description.", page)]
        : [];
    },
  },
  {
    meta: {
      id: "description.multiple",
      name: "Multiple meta descriptions",
      category: "description",
      defaultSeverity: "error",
      description: "More than one meta description is rendered.",
      help: "Render one meta description to avoid ambiguous output.",
      scope: "page",
    },
    evaluate(page, context) {
      if (!page.indexable) return [];
      return page.descriptions.length > 1
        ? [
            finding(
              this.meta,
              context.config,
              `Page contains ${page.descriptions.length} meta descriptions.`,
              page,
              {
                evidence: page.descriptions
                  .map((description) => description || "<empty description>")
                  .join(" | "),
              },
            ),
          ]
        : [];
    },
  },
  {
    meta: {
      id: "description.length",
      name: "Description length recommendation",
      category: "description",
      defaultSeverity: "info",
      description: "The description falls outside the configured editorial range.",
      help: "Review the summary for usefulness. This range is configurable guidance, not a search-engine rule.",
      scope: "page",
    },
    evaluate(page, context) {
      if (!page.indexable) return [];
      const description = page.descriptions.length === 1 ? page.descriptions[0] : undefined;
      if (!description) return [];
      const { min, max } = context.config.descriptionLength;
      if (description.length >= min && description.length <= max) return [];
      return [
        finding(
          this.meta,
          context.config,
          `Description is ${description.length} characters; configured guidance is ${min}–${max}.`,
          page,
          { evidence: description },
        ),
      ];
    },
  },
];
