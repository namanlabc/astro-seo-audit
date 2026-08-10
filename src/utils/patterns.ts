export function matchesPattern(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, "\u0000")
      .replace(/\*/g, "[^/]*")
      .replace(/\u0000/g, ".*");
    return new RegExp(`^${escaped}$`).test(value);
  });
}
