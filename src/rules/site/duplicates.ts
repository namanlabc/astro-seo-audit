import type { NormalizedPage, SiteRule } from "../../types/index.js";
import { normalizeComparableUrl } from "../../utils/urls.js";
import { finding } from "../helpers.js";

function duplicateRule(
  id: string,
  name: string,
  category: "title" | "description",
  getValue: (page: NormalizedPage) => string | undefined,
): SiteRule {
  return {
    meta: {
      id,
      name,
      category,
      defaultSeverity: "warning",
      description: `Multiple indexable pages share the same ${category}.`,
      help: `Review whether each indexable page should have a distinct, useful ${category}.`,
      scope: "site",
    },
    evaluate(context) {
      const groups = groupPages(
        context.pages.filter((page) => page.indexable),
        getValue,
      );
      return [...groups.entries()]
        .filter(([, pages]) => pages.length > 1)
        .map(([value, pages]) =>
          finding(
            this.meta,
            context.config,
            `${pages.length} indexable pages share the same ${category}.`,
            undefined,
            { evidence: value, relatedPaths: pages.map((page) => page.route) },
          ),
        );
    },
  };
}

export const duplicateRules: SiteRule[] = [
  duplicateRule("title.duplicate", "Duplicate title", "title", (page) =>
    page.titles.length === 1 && page.titles[0] ? page.titles[0].toLocaleLowerCase() : undefined,
  ),
  duplicateRule("description.duplicate", "Duplicate meta description", "description", (page) =>
    page.descriptions.length === 1 && page.descriptions[0]
      ? page.descriptions[0].toLocaleLowerCase()
      : undefined,
  ),
  {
    meta: {
      id: "canonical.duplicate",
      name: "Duplicate canonical target",
      category: "canonical",
      defaultSeverity: "warning",
      description: "Multiple indexable pages declare the same canonical URL.",
      help: "Confirm that these pages are intentional duplicates. Unique pages should normally self-canonicalize.",
      scope: "site",
    },
    evaluate(context) {
      const groups = groupPages(
        context.pages.filter((page) => page.indexable),
        (page) =>
          page.canonicals.length === 1
            ? normalizeComparableUrl(page.canonicals[0] ?? "")
            : undefined,
      );
      return [...groups.entries()]
        .filter(([, pages]) => pages.length > 1)
        .map(([canonical, pages]) =>
          finding(
            this.meta,
            context.config,
            `${pages.length} indexable pages declare the same canonical target.`,
            undefined,
            { evidence: canonical, relatedPaths: pages.map((page) => page.route) },
          ),
        );
    },
  },
];

function groupPages(
  pages: NormalizedPage[],
  getValue: (page: NormalizedPage) => string | undefined,
): Map<string, NormalizedPage[]> {
  const groups = new Map<string, NormalizedPage[]>();
  for (const page of pages) {
    const value = getValue(page)?.trim();
    if (!value) continue;
    const group = groups.get(value) ?? [];
    group.push(page);
    groups.set(value, group);
  }
  return groups;
}
