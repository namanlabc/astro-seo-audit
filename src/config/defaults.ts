import type { AuditConfig } from "../types/index.js";

export const defaultConfig: AuditConfig = {
  buildDir: "dist",
  trailingSlash: "ignore",
  ignoreRoutes: [],
  orphanExclusions: [],
  ignoredRules: [],
  severityOverrides: {},
  titleLength: { min: 30, max: 60 },
  descriptionLength: { min: 70, max: 160 },
  failOn: "none",
};

export function mergeConfig(...configs: Array<Partial<AuditConfig> | undefined>): AuditConfig {
  return configs.reduce<AuditConfig>((current, next) => {
    if (!next) return current;
    return {
      ...current,
      ...next,
      titleLength: { ...current.titleLength, ...next.titleLength },
      descriptionLength: { ...current.descriptionLength, ...next.descriptionLength },
      severityOverrides: { ...current.severityOverrides, ...next.severityOverrides },
      ignoreRoutes: next.ignoreRoutes ?? current.ignoreRoutes,
      orphanExclusions: next.orphanExclusions ?? current.orphanExclusions,
      ignoredRules: next.ignoredRules ?? current.ignoredRules,
    };
  }, defaultConfig);
}
