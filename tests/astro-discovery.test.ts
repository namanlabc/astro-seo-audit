import { describe, expect, it } from "vitest";
import { parseAstroConfigStatically } from "../src/astro/discovery.js";

describe("Astro config discovery", () => {
  it("extracts common literal settings without executing the config", () => {
    const source = `
      throw new Error('must not execute');
      export default defineConfig({
        site: 'https://example.com',
        trailingSlash: 'never',
        outDir: new URL('./public-build', import.meta.url),
      });`;
    expect(parseAstroConfigStatically(source)).toEqual({
      site: "https://example.com",
      trailingSlash: "never",
      outDir: "public-build",
    });
  });
});
