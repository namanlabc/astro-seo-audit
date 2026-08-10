import type { Finding, ScoreBreakdown, Severity } from "../types/index.js";

const weights: Record<Severity, number> = {
  error: 8,
  warning: 2,
  info: 0.25,
};

const rulePenaltyCap = 12;

export function calculateScore(findings: Finding[]): {
  score: number;
  breakdown: ScoreBreakdown;
} {
  const rawByRule = new Map<string, number>();
  for (const item of findings) {
    rawByRule.set(item.ruleId, (rawByRule.get(item.ruleId) ?? 0) + weights[item.severity]);
  }
  const penaltiesByRule = Object.fromEntries(
    [...rawByRule.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([id, penalty]) => [id, Math.min(rulePenaltyCap, penalty)]),
  );
  const penalty = Object.values(penaltiesByRule).reduce((sum, value) => sum + value, 0);
  const score = Math.max(0, Math.round(100 - penalty));
  return {
    score,
    breakdown: {
      initial: 100,
      penalty: Number(penalty.toFixed(2)),
      weights,
      rulePenaltyCap,
      penaltiesByRule,
    },
  };
}
