export interface MatchedReceiptCandidate {
  id: string;
  name: string;
  url: string;
  sourceDirectory: string;
  docDate: string; // YYYY-MM-DD
  diffDays: number;
  dayOffset: number; // Positive = after tx, negative = before tx
  extractedAmountCents?: number;
  isExactAmountMatch: boolean;
  score: number;
  matchReason: string;
}

export interface DriveReceiptFileItem {
  id: string;
  name: string;
  webViewLink?: string;
  modifiedTime?: string;
  parents?: string[];
  parentFolderName?: string;
}

/**
 * Strips extension from filename
 */
export function stripExtension(name: string): string {
  return (name || "").replace(/\.[a-zA-Z0-9]{1,10}$/i, "").trim();
}

/**
 * Evaluates Drive files for matching a financial transaction based on:
 * 1. 8-digit date prefix (YYYYMMDD)
 * 2. Day horizon & direction
 * 3. Amount suffix (e.g. _1814-26 or -1814-26 matching 1814.26)
 */
export function evaluateReceiptMatching(
  files: DriveReceiptFileItem[],
  txDateStr: string,
  txAmountCents: number,
  merchantName: string = "",
  options: {
    daysWindow?: number;
    direction?: "both" | "future" | "past";
  } = {}
): MatchedReceiptCandidate[] {
  const daysWindow = options.daysWindow !== undefined ? options.daysWindow : 30;
  const direction = options.direction || "both";
  const absAmountCents = Math.abs(txAmountCents);
  const targetFloat = (absAmountCents / 100).toFixed(2);
  const targetSuffixFormatted = targetFloat.replace(".", "-");

  let txDateObj: Date;
  try {
    const [y, m, d] = txDateStr.split("-").map(Number);
    txDateObj = new Date(y, m - 1, d);
  } catch {
    txDateObj = new Date();
  }

  const matches: MatchedReceiptCandidate[] = [];

  for (const file of files) {
    const name = (file.name || "").trim();
    const baseName = stripExtension(name);

    // 1. Date prefix check (YYYYMMDD)
    const dateMatch = name.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!dateMatch) continue;

    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    const day = parseInt(dateMatch[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) {
      continue;
    }

    const docDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const docDateObj = new Date(year, month - 1, day);
    const diffTime = docDateObj.getTime() - txDateObj.getTime();
    const dayOffset = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const diffDays = Math.abs(dayOffset);

    // 2. Horizon & Direction check
    if (direction === "future" && dayOffset < 0) continue;
    if (direction === "past" && dayOffset > 0) continue;
    if (daysWindow > 0 && daysWindow < 3650 && diffDays > daysWindow) continue;

    // 3. Amount suffix check (handling _123-45 or -123-45 or exact numbers)
    let extractedCents: number | undefined = undefined;
    let isExactAmountMatch = false;

    const suffixMatch = baseName.match(/(?:_|-|\s|^)(\d+)[-](\d{1,2})$/i);
    if (suffixMatch) {
      const whole = parseInt(suffixMatch[1], 10);
      const dec = parseInt(suffixMatch[2].padEnd(2, "0").slice(0, 2), 10);
      extractedCents = whole * 100 + dec;
    } else {
      const intMatch = baseName.match(/(?:_|-|\s|^)(\d+)$/i);
      if (intMatch) {
        extractedCents = parseInt(intMatch[1], 10) * 100;
      }
    }

    if (
      baseName.endsWith(`_${targetSuffixFormatted}`) ||
      baseName.endsWith(`-${targetSuffixFormatted}`) ||
      baseName.endsWith(` ${targetSuffixFormatted}`) ||
      baseName.endsWith(targetSuffixFormatted)
    ) {
      isExactAmountMatch = true;
      extractedCents = absAmountCents;
    } else if (extractedCents !== undefined && Math.abs(extractedCents - absAmountCents) <= 1) {
      isExactAmountMatch = true;
    }

    if (!isExactAmountMatch) continue;

    // Score calculation
    let score = 100;
    if (diffDays === 0) score += 50;
    else if (diffDays <= 3) score += 35;
    else if (diffDays <= 7) score += 20;
    else if (diffDays <= 14) score += 15;
    else if (diffDays <= 30) score += 10;

    if (merchantName && merchantName.length > 2) {
      const tokens = merchantName.toLowerCase().split(/[\s,.-]+/).filter((t) => t.length > 2);
      const nameLower = name.toLowerCase();
      if (tokens.some((tok) => nameLower.includes(tok))) {
        score += 30;
      }
    }

    const reasons: string[] = [`Exact amount match (${targetFloat})`];
    if (diffDays === 0) reasons.push("Same day transaction");
    else if (dayOffset > 0) reasons.push(`${diffDays}d in future`);
    else reasons.push(`${diffDays}d prior`);

    matches.push({
      id: file.id,
      name: file.name,
      url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      sourceDirectory: file.parentFolderName || "Google Drive",
      docDate: docDateStr,
      diffDays,
      dayOffset,
      extractedAmountCents: extractedCents,
      isExactAmountMatch,
      score,
      matchReason: reasons.join(" • "),
    });
  }

  matches.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.diffDays - b.diffDays));
  return matches;
}
