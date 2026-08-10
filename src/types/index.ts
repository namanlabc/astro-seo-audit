export type Severity = "error" | "warning" | "info";
export type FindingScope = "page" | "site";
export type PageKind = "page" | "not-found";

export type RuleCategory =
  | "title"
  | "description"
  | "canonical"
  | "indexability"
  | "headings"
  | "images"
  | "links"
  | "social"
  | "language"
  | "schema"
  | "sitemap"
  | "robots";

export interface RuleMetadata {
  id: string;
  name: string;
  category: RuleCategory;
  defaultSeverity: Severity;
  description: string;
  help: string;
  scope: FindingScope;
}

export interface Finding {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  severity: Severity;
  scope: FindingScope;
  message: string;
  help: string;
  path?: string | undefined;
  url?: string | undefined;
  evidence?: string | undefined;
  relatedPaths?: string[] | undefined;
}

export interface Heading {
  level: number;
  text: string;
}

export interface PageLink {
  href: string;
  text: string;
}

export interface PageImage {
  src: string;
  alt: string | null;
}

export interface SchemaBlock {
  raw: string;
  valid: boolean;
  empty: boolean;
  types: string[];
  error?: string | undefined;
}

export interface NormalizedPage {
  filePath: string;
  relativeFilePath: string;
  route: string;
  kind: PageKind;
  url?: string | undefined;
  titles: string[];
  descriptions: string[];
  canonicals: string[];
  robotsDirectives: string[];
  indexable: boolean;
  headings: Heading[];
  h1s: string[];
  images: PageImage[];
  links: PageLink[];
  social: Record<string, string[]>;
  lang: string | null;
  schemas: SchemaBlock[];
}

export interface AuditConfig {
  site?: string | undefined;
  buildDir: string;
  trailingSlash: "always" | "never" | "ignore";
  ignoreRoutes: string[];
  orphanExclusions: string[];
  ignoredRules: string[];
  severityOverrides: Record<string, Severity>;
  titleLength: { min: number; max: number };
  descriptionLength: { min: number; max: number };
  failOn: Severity | "none";
}

export interface AuditContext {
  pages: NormalizedPage[];
  config: AuditConfig;
  buildDir: string;
}

export interface PageRule {
  meta: RuleMetadata;
  evaluate(page: NormalizedPage, context: AuditContext): Finding[];
}

export interface SiteRule {
  meta: RuleMetadata;
  evaluate(context: AuditContext): Promise<Finding[]> | Finding[];
}

export interface PageResult {
  path: string;
  url?: string | undefined;
  file: string;
  kind: PageKind;
  indexable: boolean;
  findings: Finding[];
  passedRules: string[];
  schemaTypes: string[];
}

export interface AuditSummary {
  errors: number;
  warnings: number;
  info: number;
  passedChecks: number;
  checksRun: number;
}

export interface ScoreBreakdown {
  initial: number;
  penalty: number;
  weights: Record<Severity, number>;
  rulePenaltyCap: number;
  penaltiesByRule: Record<string, number>;
}

export interface ProjectInfo {
  projectRoot: string;
  buildDir: string;
  site?: string | undefined;
  trailingSlash: "always" | "never" | "ignore";
  astroDetected: boolean;
  configPath?: string | undefined;
}

export interface AuditReport {
  version: string;
  generatedAt: string;
  project: ProjectInfo;
  failOn: Severity | "none";
  score: number;
  scoreBreakdown: ScoreBreakdown;
  pagesScanned: number;
  summary: AuditSummary;
  pages: PageResult[];
  siteFindings: Finding[];
  sitePassedRules: string[];
  findings: Finding[];
}

export interface AuditOptions {
  cwd?: string | undefined;
  dir?: string | undefined;
  config?: Partial<AuditConfig> | undefined;
}
