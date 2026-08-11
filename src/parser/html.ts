import { DomUtils, ElementType, parseDocument } from "htmlparser2";
import type { ChildNode, Element } from "domhandler";
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
  const document = parseDocument(input.html, {
    lowerCaseAttributeNames: true,
    lowerCaseTags: true,
    recognizeSelfClosing: true,
  });
  const elements = collectElements(document.children);
  const kind = input.kind ?? "page";
  const titles = elements
    .filter((element) => element.name === "title")
    .map((element) => cleanText(DomUtils.textContent(element)));
  const descriptions = elements
    .filter(
      (element) =>
        element.name === "meta" && attribute(element, "name").toLowerCase() === "description",
    )
    .map((element) => attribute(element, "content"));
  const canonicals = elements
    .filter((element) => element.name === "link" && relTokens(element).includes("canonical"))
    .map((element) => attribute(element, "href"));
  const robotsDirectives = elements
    .filter((element) => {
      if (element.name !== "meta") return false;
      const name = attribute(element, "name").toLowerCase();
      return name === "robots" || name === "googlebot";
    })
    .flatMap((element) => attribute(element, "content").split(/[\s,]+/))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const headings = elements
    .filter((element) => /^h[1-6]$/.test(element.name))
    .map((element) => ({
      level: Number(element.name.slice(1)),
      text: cleanText(DomUtils.textContent(element)),
    }));
  const images = elements
    .filter((element) => element.name === "img")
    .map((element) => ({
      src: attribute(element, "src"),
      alt: Object.hasOwn(element.attribs, "alt") ? (element.attribs.alt ?? "") : null,
    }));
  const links = elements
    .filter((element) => element.name === "a")
    .map((element) => ({
      href: attribute(element, "href"),
      text: cleanText(DomUtils.textContent(element)),
    }));
  const social: Record<string, string[]> = {};
  for (const element of elements.filter((candidate) => candidate.name === "meta")) {
    const key = (attribute(element, "property") || attribute(element, "name")).toLowerCase();
    if (!key.startsWith("og:") && !key.startsWith("twitter:")) continue;
    (social[key] ??= []).push(attribute(element, "content"));
  }
  const schemas = elements
    .filter(
      (element) =>
        element.name === "script" &&
        attribute(element, "type").toLowerCase() === "application/ld+json",
    )
    .map((element) => parseSchema(DomUtils.textContent(element)));
  const htmlElement = elements.find((element) => element.name === "html");
  const lang = htmlElement
    ? Object.hasOwn(htmlElement.attribs, "lang")
      ? attribute(htmlElement, "lang")
      : null
    : null;

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
    lang,
    schemas,
  };
}

function collectElements(nodes: ChildNode[]): Element[] {
  const elements: Element[] = [];
  const visit = (node: ChildNode): void => {
    if (
      node.type === ElementType.Tag ||
      node.type === ElementType.Script ||
      node.type === ElementType.Style
    ) {
      elements.push(node);
    }
    if ("children" in node) node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return elements;
}

function attribute(element: Element, name: string): string {
  return (element.attribs[name] ?? "").trim();
}

function relTokens(element: Element): string[] {
  return attribute(element, "rel").toLowerCase().split(/\s+/).filter(Boolean);
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
