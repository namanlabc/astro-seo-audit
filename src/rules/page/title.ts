import type { PageRule } from "../../types/index.js";
import { finding } from "../helpers.js";

export const titleRules: PageRule[] = [
  {
    meta: {
      id: "title.missing",
      name: "Missing title",
      category: "title",
      defaultSeverity: "error",
      description: "The document has no title element.",
      help: "Add one descriptive <title> element to the document head.",
      scope: "page",
    },
    evaluate(page, context) {
      if (page.kind === "not-found") return [];
      return page.titles.length === 0
        ? [finding(this.meta, context.config, "Page has no <title> element.", page)]
        : [];
    },
  },
  {
    meta: {
      id: "title.empty",
      name: "Empty title",
      category: "title",
      defaultSeverity: "error",
      description: "The title element is present but empty.",
      help: "Give the page a concise title that describes its primary purpose.",
      scope: "page",
    },
    evaluate(page, context) {
      if (page.kind === "not-found") return [];
      return page.titles.some((title) => title.length === 0)
        ? [finding(this.meta, context.config, "Page contains an empty <title> element.", page)]
        : [];
    },
  },
  {
    meta: {
      id: "title.multiple",
      name: "Multiple titles",
      category: "title",
      defaultSeverity: "error",
      description: "The document contains more than one title element.",
      help: "Render one unambiguous <title> element in the final HTML.",
      scope: "page",
    },
    evaluate(page, context) {
      if (page.kind === "not-found") return [];
      return page.titles.length > 1
        ? [
            finding(
              this.meta,
              context.config,
              `Page contains ${page.titles.length} <title> elements.`,
              page,
              { evidence: page.titles.map((title) => title || "<empty title>").join(" | ") },
            ),
          ]
        : [];
    },
  },
  {
    meta: {
      id: "title.length",
      name: "Title length recommendation",
      category: "title",
      defaultSeverity: "info",
      description: "The title falls outside the configured editorial range.",
      help: "Review the title for clarity. Search engines do not enforce a fixed character limit, so treat this as editorial guidance.",
      scope: "page",
    },
    evaluate(page, context) {
      if (!page.indexable) return [];
      const title = page.titles.length === 1 ? page.titles[0] : undefined;
      if (!title) return [];
      const { min, max } = context.config.titleLength;
      if (title.length >= min && title.length <= max) return [];
      return [
        finding(
          this.meta,
          context.config,
          `Title is ${title.length} characters; configured guidance is ${min}–${max}.`,
          page,
          { evidence: title },
        ),
      ];
    },
  },
];
