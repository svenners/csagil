export interface CategoryRuleItem {
  id: string;
  keyword: string;
  matchType: "contains" | "exact" | "starts_with";
  matchField?: "all" | "merchant" | "description" | "filename";
  targetCategoryId: string;
}

export function cleanString(val: string): string {
  return (val || "").toLowerCase().trim();
}

export function cleanFileNameForMatching(fileName: string = ""): string {
  if (!fileName) return "";
  const withoutExt = fileName.replace(/\.[a-zA-Z0-9]{2,5}$/i, "");
  return withoutExt.replace(/[_\-\.]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Finds matching category rule for a transaction based on merchant, description, and filename
 */
export function findMatchingCategoryRule(
  merchant: string = "",
  description: string = "",
  rules: CategoryRuleItem[] = [],
  fileName: string = ""
): string | null {
  if (!rules || rules.length === 0) return null;

  const cleanMerchant = cleanString(merchant);
  const cleanDesc = cleanString(description);
  const rawFileName = cleanString(fileName);
  const cleanFile = cleanString(cleanFileNameForMatching(fileName));

  for (const rule of rules) {
    if (!rule.keyword || !rule.targetCategoryId) continue;
    const cleanKw = cleanString(rule.keyword);
    const matchField = rule.matchField || "all";

    const checkMerchant = matchField === "all" || matchField === "merchant";
    const checkDesc = matchField === "all" || matchField === "description";
    const checkFile = matchField === "all" || matchField === "filename";

    if (rule.matchType === "exact") {
      if (checkMerchant && cleanMerchant === cleanKw) return rule.targetCategoryId;
      if (checkDesc && cleanDesc === cleanKw) return rule.targetCategoryId;
      if (checkFile && (rawFileName === cleanKw || cleanFile === cleanKw)) return rule.targetCategoryId;
    } else if (rule.matchType === "starts_with") {
      if (checkMerchant && cleanMerchant.startsWith(cleanKw)) return rule.targetCategoryId;
      if (checkDesc && cleanDesc.startsWith(cleanKw)) return rule.targetCategoryId;
      if (checkFile && (rawFileName.startsWith(cleanKw) || cleanFile.startsWith(cleanKw))) return rule.targetCategoryId;
    } else {
      // Default: 'contains'
      if (checkMerchant && cleanMerchant.includes(cleanKw)) return rule.targetCategoryId;
      if (checkDesc && cleanDesc.includes(cleanKw)) return rule.targetCategoryId;
      if (checkFile && (rawFileName.includes(cleanKw) || cleanFile.includes(cleanKw))) return rule.targetCategoryId;
    }
  }

  return null;
}
