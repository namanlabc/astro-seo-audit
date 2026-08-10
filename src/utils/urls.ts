import path from "node:path";
import type { AuditConfig } from "../types/index.js";

const assetExtensions = new Set([
  ".avif",
  ".css",
  ".csv",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".map",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".svg",
  ".txt",
  ".webmanifest",
  ".webp",
  ".woff",
  ".woff2",
  ".xml",
  ".zip",
]);

export function htmlFileToRoute(relativeFilePath: string): string {
  const normalized = relativeFilePath.split(path.sep).join("/");
  if (normalized === "index.html") return "/";
  if (normalized.endsWith("/index.html")) return `/${normalized.slice(0, -"index.html".length)}`;
  return `/${normalized}`;
}

export function routeWithPolicy(
  route: string,
  trailingSlash: AuditConfig["trailingSlash"],
): string {
  if (route === "/") return route;
  if (route.endsWith(".html")) return route;
  if (trailingSlash === "always") return route.endsWith("/") ? route : `${route}/`;
  if (trailingSlash === "never") return route.replace(/\/+$/, "");
  return route;
}

export function absolutePageUrl(site: string | undefined, route: string): string | undefined {
  if (!site) return undefined;
  try {
    return new URL(route, ensureTrailingSlash(site)).href;
  } catch {
    return undefined;
  }
}

export interface ResolvedLink {
  kind: "internal" | "external" | "ignored" | "malformed";
  route?: string;
  original: string;
  reason?: string;
}

export function resolveLink(
  href: string,
  fromRoute: string,
  site: string | undefined,
): ResolvedLink {
  const value = href.trim();
  if (!value || value.startsWith("#")) return { kind: "ignored", original: href };
  if (/^(mailto|tel|javascript|data):/i.test(value)) return { kind: "ignored", original: href };
  if (value.startsWith("//")) return { kind: "external", original: href };

  const origin = safeOrigin(site);
  const base = origin ? new URL(fromRoute, origin) : new URL(fromRoute, "https://audit.invalid");
  try {
    const url = new URL(value, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { kind: "ignored", original: href };
    }
    if (url.origin !== base.origin) return { kind: "external", original: href };
    const decodedPath = decodeURI(url.pathname).replace(/\/+/g, "/");
    return { kind: "internal", original: href, route: decodedPath || "/" };
  } catch (error) {
    return {
      kind: "malformed",
      original: href,
      reason: error instanceof Error ? error.message : "Invalid URL",
    };
  }
}

export function routeCandidates(route: string): string[] {
  const clean = route.split("?")[0]?.split("#")[0] || "/";
  const withoutIndex = clean.replace(/\/index\.html$/i, "/");
  const noSlash = withoutIndex === "/" ? "/" : withoutIndex.replace(/\/+$/, "");
  const candidates = new Set([withoutIndex, noSlash, `${noSlash}/`]);
  if (noSlash.endsWith(".html")) candidates.add(noSlash.slice(0, -5));
  else if (noSlash !== "/") candidates.add(`${noSlash}.html`);
  return [...candidates];
}

export function isLikelyAsset(route: string): boolean {
  return assetExtensions.has(path.posix.extname(route).toLowerCase());
}

export function normalizeComparableUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/index\.html$/i, "/").replace(/\/+/g, "/");
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/$/, "");
    return url.href;
  } catch {
    return undefined;
  }
}

function safeOrigin(site: string | undefined): string | undefined {
  if (!site) return undefined;
  try {
    return new URL(site).origin;
  } catch {
    return undefined;
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
