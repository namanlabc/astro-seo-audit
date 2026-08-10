import { describe, expect, it } from "vitest";
import { calculateScore } from "../src/scoring/calculate.js";
import type { Finding } from "../src/types/index.js";

function fakeFinding(ruleId: string, severity: Finding["severity"]): Finding {
  return {
    ruleId,
    ruleName: ruleId,
    category: "title",
    severity,
    scope: "page",
    message: "Test",
    help: "Test",
  };
}

describe("health score", () => {
  it("weights severity and caps repeated findings per rule", () => {
    const repeated = Array.from({ length: 200 }, () => fakeFinding("title.length", "info"));
    const { score, breakdown } = calculateScore(repeated);
    expect(breakdown.penaltiesByRule["title.length"]).toBe(12);
    expect(score).toBe(88);
  });

  it("is deterministic regardless of finding order", () => {
    const findings = [fakeFinding("a", "error"), fakeFinding("b", "warning")];
    expect(calculateScore(findings)).toEqual(calculateScore([...findings].reverse()));
  });
});
