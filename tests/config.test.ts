import { describe, expect, it } from "vitest";
import { validateConfig } from "../src/config/load.js";

describe("configuration", () => {
  it("accepts the documented configuration shape", () => {
    expect(
      validateConfig({
        ignoreRoutes: ["/drafts/**"],
        severityOverrides: { "description.missing": "info" },
        titleLength: { min: 25, max: 65 },
        descriptionLength: { min: 60, max: 170 },
        failOn: "error",
      }),
    ).toMatchObject({
      ignoreRoutes: ["/drafts/**"],
      failOn: "error",
    });
  });

  it("rejects inverted editorial ranges", () => {
    expect(() => validateConfig({ titleLength: { min: 70, max: 20 } })).toThrow(
      "titleLength.min cannot be greater",
    );
  });
});
