import type { PageRule, RuleMetadata } from "../../types/index.js";
import { finding } from "../helpers.js";

function socialRule(id: string, key: string, label: string): PageRule {
  const meta: RuleMetadata = {
    id,
    name: `Missing ${label}`,
    category: "social",
    defaultSeverity: "info",
    description: `${label} is not present.`,
    help: "Social metadata affects link previews, not whether the page can be indexed.",
    scope: "page",
  };
  return {
    meta,
    evaluate(page, context) {
      if (page.kind === "not-found") return [];
      return !page.social[key]?.some(Boolean)
        ? [finding(meta, context.config, `Page is missing ${label}.`, page)]
        : [];
    },
  };
}

export const socialSchemaRules: PageRule[] = [
  socialRule("og.title-missing", "og:title", "og:title"),
  socialRule("og.description-missing", "og:description", "og:description"),
  socialRule("og.image-missing", "og:image", "og:image"),
  socialRule("og.url-missing", "og:url", "og:url"),
  {
    meta: {
      id: "twitter.card-missing",
      name: "Missing Twitter/X card type",
      category: "social",
      defaultSeverity: "info",
      description: "No twitter:card value is present.",
      help: "Consider adding twitter:card for predictable X/Twitter previews. OG title, description, and image fallbacks are accepted.",
      scope: "page",
    },
    evaluate(page, context) {
      if (page.kind === "not-found") return [];
      return !page.social["twitter:card"]?.some(Boolean)
        ? [finding(this.meta, context.config, "Page is missing twitter:card.", page)]
        : [];
    },
  },
  {
    meta: {
      id: "language.missing",
      name: "Missing HTML language",
      category: "language",
      defaultSeverity: "warning",
      description: "The html element has no lang attribute.",
      help: "Set a valid language tag such as en or en-US on the root html element.",
      scope: "page",
    },
    evaluate(page, context) {
      return page.lang === null
        ? [finding(this.meta, context.config, "The <html> element has no lang attribute.", page)]
        : [];
    },
  },
  {
    meta: {
      id: "language.empty",
      name: "Empty HTML language",
      category: "language",
      defaultSeverity: "warning",
      description: "The html lang attribute is empty.",
      help: "Set a valid language tag such as en or en-US.",
      scope: "page",
    },
    evaluate(page, context) {
      return page.lang === ""
        ? [finding(this.meta, context.config, "The <html> lang attribute is empty.", page)]
        : [];
    },
  },
  {
    meta: {
      id: "language.malformed",
      name: "Malformed HTML language",
      category: "language",
      defaultSeverity: "warning",
      description: "The html lang value is not recognizably BCP 47-shaped.",
      help: "Use a language tag such as en, en-US, or zh-Hant. This check is deliberately conservative.",
      scope: "page",
    },
    evaluate(page, context) {
      return page.lang && !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(page.lang)
        ? [
            finding(
              this.meta,
              context.config,
              `HTML language value looks malformed: ${page.lang}.`,
              page,
            ),
          ]
        : [];
    },
  },
  {
    meta: {
      id: "schema.empty",
      name: "Empty JSON-LD",
      category: "schema",
      defaultSeverity: "warning",
      description: "A JSON-LD script is empty.",
      help: "Remove the empty block or render valid JSON-LD. Schema is optional and does not guarantee rich results.",
      scope: "page",
    },
    evaluate(page, context) {
      const count = page.schemas.filter((schema) => schema.empty).length;
      return count
        ? [
            finding(
              this.meta,
              context.config,
              `${count} JSON-LD block${count === 1 ? " is" : "s are"} empty.`,
              page,
            ),
          ]
        : [];
    },
  },
  {
    meta: {
      id: "schema.invalid-json",
      name: "Invalid JSON-LD",
      category: "schema",
      defaultSeverity: "error",
      description: "A JSON-LD script cannot be parsed as JSON.",
      help: "Fix the JSON syntax. This check validates parsing only, not rich-result eligibility.",
      scope: "page",
    },
    evaluate(page, context) {
      const invalid = page.schemas.filter((schema) => !schema.valid && !schema.empty);
      return invalid.map((schema) =>
        finding(this.meta, context.config, "JSON-LD contains invalid JSON.", page, {
          evidence: schema.error,
        }),
      );
    },
  },
];
