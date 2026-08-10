import type { NormalizedPage, SiteRule } from "../../types/index.js";
import { matchesPattern } from "../../utils/patterns.js";
import { isLikelyAsset, resolveLink, routeCandidates } from "../../utils/urls.js";
import { finding } from "../helpers.js";

export const linkRules: SiteRule[] = [
  {
    meta: {
      id: "links.malformed-internal",
      name: "Malformed internal URL",
      category: "links",
      defaultSeverity: "error",
      description: "An internal link cannot be parsed safely.",
      help: "Fix invalid URL syntax or escaping in the href value.",
      scope: "site",
    },
    evaluate(context) {
      const results = [];
      for (const page of context.pages) {
        for (const link of page.links) {
          const resolved = resolveLink(link.href, page.route, context.config.site);
          if (resolved.kind !== "malformed") continue;
          results.push(
            finding(
              this.meta,
              context.config,
              `Malformed link from ${page.route}: ${link.href}`,
              undefined,
              { evidence: resolved.reason, relatedPaths: [page.route] },
            ),
          );
        }
      }
      return results;
    },
  },
  {
    meta: {
      id: "links.broken-internal",
      name: "Broken internal link",
      category: "links",
      defaultSeverity: "error",
      description: "An internal page link does not match generated HTML output.",
      help: "Correct the href, generate the target page, or exclude an intentional non-page route in configuration.",
      scope: "site",
    },
    evaluate(context) {
      const routeSet = buildRouteSet(context.pages);
      const results = [];
      for (const page of context.pages) {
        for (const link of page.links) {
          const resolved = resolveLink(link.href, page.route, context.config.site);
          if (resolved.kind !== "internal" || !resolved.route) continue;
          if (isLikelyAsset(resolved.route)) continue;
          if (matchesPattern(resolved.route, context.config.ignoreRoutes)) continue;
          if (routeCandidates(resolved.route).some((candidate) => routeSet.has(candidate)))
            continue;
          results.push(
            finding(this.meta, context.config, `${page.route} → ${resolved.route}`, undefined, {
              evidence: link.href,
              relatedPaths: [page.route, resolved.route],
            }),
          );
        }
      }
      return results;
    },
  },
  {
    meta: {
      id: "links.orphan-page",
      name: "Orphan page",
      category: "links",
      defaultSeverity: "warning",
      description: "An indexable generated page receives no internal HTML links.",
      help: "Link to the page from another relevant page, or exclude intentional standalone routes from orphan checks.",
      scope: "site",
    },
    evaluate(context) {
      const routeSet = buildRouteSet(context.pages);
      const incoming = new Set<string>();
      for (const page of context.pages) {
        for (const link of page.links) {
          const resolved = resolveLink(link.href, page.route, context.config.site);
          if (resolved.kind !== "internal" || !resolved.route) continue;
          const matched = routeCandidates(resolved.route).find((candidate) =>
            routeSet.has(candidate),
          );
          if (matched) incoming.add(matched);
        }
      }
      return context.pages
        .filter(
          (page) =>
            page.indexable &&
            page.route !== "/" &&
            !routeCandidates(page.route).some((candidate) => incoming.has(candidate)) &&
            !matchesPattern(page.route, context.config.orphanExclusions),
        )
        .map((page) =>
          finding(
            this.meta,
            context.config,
            `${page.route} has no incoming internal links.`,
            undefined,
            {
              relatedPaths: [page.route],
            },
          ),
        );
    },
  },
];

function buildRouteSet(pages: NormalizedPage[]): Set<string> {
  return new Set(pages.flatMap((page) => routeCandidates(page.route)));
}
