import { describe, expect, it } from "vitest";
import { pageTargetFileCandidates } from "../src/crawler/discover.js";
import {
  htmlFileKind,
  htmlFileToRoute,
  resolveLink,
  routeCandidates,
  routeWithPolicy,
} from "../src/utils/urls.js";

describe("URL normalization", () => {
  it.each([
    ["index.html", "/"],
    ["about/index.html", "/about/"],
    ["nested/page.html", "/nested/page.html"],
  ])("maps %s to %s", (file, expected) => {
    expect(htmlFileToRoute(file)).toBe(expected);
  });

  it.each([
    ["404.html", "not-found"],
    ["404/index.html", "not-found"],
    ["en/404.html", "not-found"],
    ["articles/404-things.html", "page"],
    ["index.html", "page"],
  ] as const)("classifies %s as %s", (file, expected) => {
    expect(htmlFileKind(file)).toBe(expected);
  });

  it("applies trailing slash policy without rewriting html files", () => {
    expect(routeWithPolicy("/about/", "never")).toBe("/about");
    expect(routeWithPolicy("/about", "always")).toBe("/about/");
    expect(routeWithPolicy("/about.html", "always")).toBe("/about.html");
  });

  it("resolves nested relative and root-relative internal links", () => {
    expect(resolveLink("../about/", "/guides/start/", "https://example.com")).toMatchObject({
      kind: "internal",
      route: "/guides/about/",
    });
    expect(resolveLink("/about/#team", "/", "https://example.com")).toMatchObject({
      kind: "internal",
      route: "/about/",
    });
  });

  it("distinguishes external, ignored, and malformed links", () => {
    expect(resolveLink("https://other.example/page", "/", "https://example.com").kind).toBe(
      "external",
    );
    expect(resolveLink("mailto:a@example.com", "/", undefined).kind).toBe("ignored");
    expect(resolveLink("/%E0%A4%A", "/", undefined).kind).toBe("malformed");
  });

  it("creates equivalent route candidates", () => {
    expect(routeCandidates("/about/index.html")).toEqual(
      expect.arrayContaining(["/about/", "/about", "/about.html"]),
    );
  });

  it.each([
    ["/", ["index.html"]],
    ["/about/", ["about/index.html", "about.html"]],
    ["/about", ["about/index.html", "about.html"]],
    ["/about.html", ["about.html", "about/index.html"]],
    [
      "https://example.com/guides/getting-started/?preview=true#intro",
      ["guides/getting-started/index.html", "guides/getting-started.html"],
    ],
  ])("maps page target %s to generated file candidates", (target, expected) => {
    expect(pageTargetFileCandidates(target, "https://example.com")).toEqual(expected);
  });

  it("rejects an absolute page URL from a different configured origin", () => {
    expect(() =>
      pageTargetFileCandidates("https://other.example/about/", "https://example.com"),
    ).toThrow("configured site origin");
  });

  it("rejects malformed page target encoding", () => {
    expect(() => pageTargetFileCandidates("/%E0%A4%A")).toThrow("malformed URL encoding");
  });
});
