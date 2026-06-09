// Fixed order of GPC quiz categories. The quiz shows exactly one question
// per category in this order; the admin tags each question with one of these
// values. Renaming or reordering here changes the player experience and the
// admin dropdown simultaneously.
export const GPC_CATEGORIES = [
  "CAD Design",
  "Articles / Items",
  "Product Knowledge and Rules",
  "Sales Configuration",
  "Production Configuration",
  "CAD Configuration",
] as const;

export type GpcCategory = (typeof GPC_CATEGORIES)[number];
