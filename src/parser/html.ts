import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { NormalizedPage, PageKind, SchemaBlock } from "../types/index.js";

export interface ParsePageInput {
  html: string;
  filePath: string;
  relativeFilePath: string;
  route: string;
  kind?: PageKind | undefined;
  url?: string | undefined;
}

export function parseHtmlPage(input: ParsePageInput): NormalizedPage {
  const $ = cheerio.load(input.html);
  const kind = input.kind ?? "page";
  const titles = $("title")
    .map((_, element) => cleanText($(element).text()))
    .get();
  const descriptions = metaValues($, "name", "description");
  const canonicals = $("link")
    .filter((_, element) => relTokens(element).includes("canonical"))
    .map((_, element) => ($(element).attr("href") ?? "").trim())
    .get();
  const robotsDirectives = $("meta")
    .filter((_, element) => {
      const name = ($(element).attr("name") ?? "").toLowerCase();
      return name === "robots" || name === "googlebot";
    })
    .map((_, element) => $(element).attr("content") ?? "")
    .get()
    .flatMap((value) => value.split(/[\s,]+/))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const headings = $("h1, h2, h3, h4, h5, h6")
    .map((_, element) => ({
      level: Number(element.tagName.slice(1)),
      text: cleanText($(element).text()),
    }))
    .get();
  const images = $("img")
    .map((_, element) => ({
      src: ($(element).attr("src") ?? "").trim(),
      alt: $(element).attr("alt") ?? null,
    }))
    .get();
  const links = $("a")
    .map((_, element) => ({
      href: ($(element).attr("href") ?? "").trim(),
      text: cleanText($(element).text()),
    }))
    .get();
  const social: Record<string, string[]> = {};
  $("meta").each((_, element) => {
    const key = (($(element).attr("property") ?? $(element).attr("name")) || "").toLowerCase();
    if (!key.startsWith("og:") && !key.startsWith("twitter:")) return;
    (social[key] ??= []).push(($(element).attr("content") ?? "").trim());
  });
  const schemas = $('script[type="application/ld+json" i]')
    .map((_, element) => parseSchema($(element).text()))
    .get();

  return {
    filePath: input.filePath,
    relativeFilePath: input.relativeFilePath,
    route: input.route,
    kind,
    url: input.url,
    titles,
    descriptions,
    canonicals,
    robotsDirectives,
    indexable: kind === "page" && !robotsDirectives.includes("noindex"),
    headings,
    h1s: headings.filter((heading) => heading.level === 1).map((heading) => heading.text),
    images,
    links,
    social,
    lang: ($("html").first().attr("lang") ?? null)?.trim() ?? null,
    schemas,
  };
}

function metaValues($: cheerio.CheerioAPI, attribute: string, expected: string): string[] {
  return $("meta")
    .filter(
      (_, element) =>
        ($(element).attr(attribute) ?? "").trim().toLowerCase() === expected.toLowerCase(),
    )
    .map((_, element) => ($(element).attr("content") ?? "").trim())
    .get();
}

function relTokens(element: Element): string[] {
  const rel = element.attribs?.rel ?? "";
  return rel.toLowerCase().split(/\s+/).filter(Boolean);
}

function parseSchema(raw: string): SchemaBlock {
  const text = raw.trim();
  if (!text) return { raw, valid: false, empty: true, types: [] };
  try {
    const value = JSON.parse(text) as unknown;
    return { raw, valid: true, empty: false, types: collectSchemaTypes(value) };
  } catch (error) {
    return {
      raw,
      valid: false,
      empty: false,
      types: [],
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

function collectSchemaTypes(value: unknown): string[] {
  const types = new Set<string>();
  const visit = (current: unknown): void => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (typeof current !== "object" || current === null) return;
    const object = current as Record<string, unknown>;
    const type = object["@type"];
    if (typeof type === "string") types.add(type);
    else if (Array.isArray(type)) {
      type
        .filter((item): item is string => typeof item === "string")
        .forEach((item) => types.add(item));
    }
    if ("@graph" in object) visit(object["@graph"]);
  };
  visit(value);
  return [...types];
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
