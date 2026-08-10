import type { PageRule } from "../../types/index.js";
import { canonicalRules } from "./canonical.js";
import { contentRules } from "./content.js";
import { descriptionRules } from "./description.js";
import { socialSchemaRules } from "./social-schema.js";
import { titleRules } from "./title.js";

export const pageRules: PageRule[] = [
  ...titleRules,
  ...descriptionRules,
  ...canonicalRules,
  ...contentRules,
  ...socialSchemaRules,
];
