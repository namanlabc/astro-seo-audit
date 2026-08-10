import { describe, expect, it } from "vitest";
import { parseHtmlPage } from "../src/parser/html.js";

describe("HTML parser", () => {
  it("normalizes SEO data and preserves decorative empty alt text", () => {
    const page = parseHtmlPage({
      html: `<!doctype html><html lang="en"><head>
        <title> Example   title </title>
        <meta NAME="description" content="Summary">
        <script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":["FAQPage","Thing"]}]}</script>
      </head><body><h1>Hello <span>world</span></h1>
        <img src="decorative.svg" alt=""><img src="photo.jpg">
      </body></html>`,
      filePath: "/tmp/index.html",
      relativeFilePath: "index.html",
      route: "/",
    });

    expect(page.titles).toEqual(["Example title"]);
    expect(page.descriptions).toEqual(["Summary"]);
    expect(page.h1s).toEqual(["Hello world"]);
    expect(page.images).toEqual([
      { src: "decorative.svg", alt: "" },
      { src: "photo.jpg", alt: null },
    ]);
    expect(page.schemas[0]).toMatchObject({
      valid: true,
      types: ["WebPage", "FAQPage", "Thing"],
    });
  });

  it("records invalid and empty JSON-LD without throwing", () => {
    const page = parseHtmlPage({
      html: `<script type="application/ld+json"></script><script type="application/ld+json">{bad}</script>`,
      filePath: "/tmp/index.html",
      relativeFilePath: "index.html",
      route: "/",
    });
    expect(page.schemas).toHaveLength(2);
    expect(page.schemas[0]).toMatchObject({ empty: true, valid: false });
    expect(page.schemas[1]).toMatchObject({ empty: false, valid: false });
  });

  it("marks generated not-found documents as non-indexable", () => {
    const page = parseHtmlPage({
      html: `<html lang="en"><head><title>Page not found</title></head><body><h1>Not found</h1></body></html>`,
      filePath: "/tmp/404.html",
      relativeFilePath: "404.html",
      route: "/404.html",
      kind: "not-found",
    });

    expect(page.kind).toBe("not-found");
    expect(page.indexable).toBe(false);
  });
});
