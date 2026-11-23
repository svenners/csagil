import * as XLSX from "xlsx";
import { extractText } from "unpdf";

export interface ParsedTransactionRow {
  date: string; // YYYY-MM-DD
  merchant: string;
  description: string;
  amountCents: number; // positive = credit, negative = debit
  type: "credit" | "debit";
  account: string;
  rawLine?: string;
}

export function normalizeStatementLine(line: string): string {
  if (!line) return "";
  let s = line.trim();
  // Unglue date from doc number or text
  s = s.replace(/\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})([A-Za-z0-9])/g, "$1 $2");
  // Unglue 4-8 digit doc number
  s = s.replace(/\b(\d{4,8})([A-Za-z])/g, "$1 $2");
  // Unglue amount from D/C indicator (e.g. 1.814,26D -> 1.814,26 D)
  s = s.replace(/(\d+[\.,]\d{2})([DCdc])\b/g, "$1 $2");
  s = s.replace(/\b([DCdc])(\d+[\.,]\d{2})/g, "$1 $2");
  s = s.replace(/\s*\|\s*/g, " ");
  return s;
}

export function cleanNumberCents(str: string): number {
  if (!str) return 0;
  let c = str.trim();
  const isParen = /^\(.*\)$/.test(c);
  c = c.replace(/[\$\(\)R\s€£]/g, "");
  const isTrailingMinus = c.endsWith("-");
  if (isTrailingMinus) c = c.slice(0, -1);

  if (c.includes(",") && (!c.includes(".") || c.lastIndexOf(",") > c.lastIndexOf("."))) {
    c = c.replace(/\./g, "").replace(",", ".");
  } else {
    c = c.replace(/,/g, "");
  }
  c = c.replace(/[^\d.-]/g, "");
  let num = parseFloat(c);
  if (isNaN(num)) return 0;
  if (isParen || isTrailingMinus) num = -Math.abs(num);
  return Math.round(num * 100);
}

export function cleanMerchant(desc: string): string {
  const upper = desc.toUpperCase();
  if (upper.includes("CLARO") || upper.includes("DEBITO NET") || upper.includes("NET RES")) return "Claro Telecom";
  if (upper.includes("AWS") || upper.includes("AMAZON")) return "AWS Cloud Services";
  if (upper.includes("STRIPE")) return "Stripe Payout";
  if (upper.includes("DELTA")) return "Delta Airlines";
  if (upper.includes("ADOBE")) return "Adobe Creative Cloud";
  if (upper.includes("GUSTO")) return "Gusto Payroll";
  if (upper.includes("STARBUCKS")) return "Starbucks Coffee";
  if (upper.includes("UBER")) return "Uber Technologies";
  if (upper.includes("LUZ/GAS") || upper.includes("PG LUZ") || upper.includes("ENERGIA")) return "Electric & Gas Utility";
  if (upper.includes("PAG BOLETO") || upper.includes("PG BOLETO") || upper.includes("BOLETO")) return "Boleto Payment";
  if (upper.includes("CRED PIX") || upper.includes("REC PIX")) return "Pix Payment Received";
  if (upper.includes("ENV PIX CH") || upper.includes("ENVIO PIX CH")) return "Pix Transfer Sent (Chave)";
  if (upper.includes("ENV PIX") || upper.includes("ENVIO PIX")) return "Pix Transfer Sent";
  if (upper.includes("TAR PIX") || upper.includes("TARIFA PIX")) return "Pix Fee (Caixa)";
  if (upper.includes("CRED TED") || upper.includes("TED REC")) return "TED Wire Transfer Received";
  if (upper.includes("ENV TED") || upper.includes("TED ENV")) return "TED Wire Transfer Sent";
  if (upper.includes("APLIC FUND") || upper.includes("APLICACAO")) return "Fund Investment (Aplicação)";
  if (upper.includes("RESG AUT") || upper.includes("RESGATE")) return "Fund Redemption (Resgate)";
  if (upper.includes("DB T CESTA") || upper.includes("CESTA") || upper.includes("TARIFA")) return "Caixa Service Fee (Cesta)";
  if (upper.includes("GOOGLE")) return "Google Workspace / Cloud";
  if (upper.includes("MICROSOFT")) return "Microsoft 365";
  if (upper.includes("WEWORK")) return "WeWork Office Space";
  return desc.replace(/\(Doc:?\s*\d+\)/gi, "").replace(/\b\d{6,}\b/g, "").trim() || "Bank Transaction";
}

function formatDateToIso(dateStr: string): string {
  const parts = dateStr.split(/[\/\.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
    // DD/MM/YYYY
    const d = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${y}-${m}-${d}`;
  }
  return new Date().toISOString().split("T")[0];
}

export function parseStatementText(
  fileContent: string,
  fileName: string = "Statement"
): { bankName: string; account: string; transactions: ParsedTransactionRow[] } {
  const results: ParsedTransactionRow[] = [];
  let bankName = "Bank Account";
  let account = fileName.replace(/\.[^/.]+$/, "");

  const upper = fileContent.toUpperCase();
  if (upper.includes("CAIXA") || upper.includes("GERENCIADOR CAIXA")) {
    bankName = "Caixa Econômica Federal";
  } else if (upper.includes("BRADESCO")) {
    bankName = "Banco Bradesco";
  } else if (upper.includes("ITAU") || upper.includes("ITAÚ")) {
    bankName = "Banco Itaú";
  } else if (upper.includes("BANCO DO BRASIL") || upper.includes("BB S.A.")) {
    bankName = "Banco do Brasil";
  } else if (upper.includes("SANTANDER")) {
    bankName = "Banco Santander";
  } else if (upper.includes("NUBANK")) {
    bankName = "Nubank";
  }

  // 1. OFX Parsing
  if (fileContent.includes("<STMTTRN>") || fileContent.includes("<OFX>")) {
    const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;
    while ((match = trnRegex.exec(fileContent)) !== null) {
      const block = match[1];
      const dateMatch = block.match(/<DTPOSTED>\s*(\d{4})(\d{2})(\d{2})/i);
      const amtMatch = block.match(/<TRNAMT>\s*([^\r\n<]+)/i);
      const memoMatch = block.match(/<(?:MEMO|NAME)>\s*([^\r\n<]+)/i);
      const docMatch = block.match(/<(?:CHECKNUM|FITID)>\s*([^\r\n<]+)/i);

      if (amtMatch && dateMatch) {
        const cents = cleanNumberCents(amtMatch[1]);
        if (Math.abs(cents) > 0) {
          const isoDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
          const desc = memoMatch ? memoMatch[1].trim() : "OFX Transaction";
          const docNo = docMatch ? docMatch[1].trim() : "";
          const isCredit = cents > 0;
          results.push({
            date: isoDate,
            merchant: cleanMerchant(desc),
            description: `${desc}${docNo ? ` (Doc: ${docNo})` : ""}`,
            amountCents: isCredit ? Math.abs(cents) : -Math.abs(cents),
            type: isCredit ? "credit" : "debit",
            account,
          });
        }
      }
    }
    if (results.length > 0) {
      return { bankName, account, transactions: results };
    }
  }

  // 2. Line-by-line bank statement parsing
  const rawLines = fileContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lines = rawLines.map((l) => normalizeStatementLine(l)).filter(Boolean);

  const extratoLineRegex =
    /^(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\s+(?:(\d{4,8})\s+)?(.+?)\s+([R\$\s]*[\+\-\(]?[\d\.,]+[\-\)]?)\s*([DCdc])?(?:\s+([R\$\s]*[\d\.,]+)\s*([DCdc])?)?$/;
  const standardDateRegex =
    /^(\d{1,4}[-\/\.]\d{1,2}[-\/\.]\d{1,4})\s+(.+?)\s+([\+\-\(]?[\$R€£\s]*[\d\.,]+[\-\)]?)\s*([DCdc])?$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const uLine = line.toUpperCase();

    if (
      uLine.includes("SALDO DIA") ||
      uLine.includes("SALDO ANTERIOR") ||
      uLine.includes("SALDO FINAL") ||
      uLine.includes("SALDO INICIAL") ||
      uLine.includes("SALDO ATUAL") ||
      uLine.includes("TOTAL DE DEBITOS") ||
      uLine.includes("TOTAL DE CREDITOS") ||
      uLine.includes("NR. DOC.") ||
      uLine.includes("DATA MOV.") ||
      uLine.includes("HISTÓRICO") ||
      uLine.includes("HISTORICO")
    ) {
      continue;
    }

    // Extrato line match
    const exMatch = line.match(extratoLineRegex);
    if (exMatch) {
      const [, dateStr, docNo, descRaw, amountStr, dcType] = exMatch;
      const desc = descRaw.trim();
      const cents = cleanNumberCents(amountStr);
      if (Math.abs(cents) > 0) {
        const dcUpper = (dcType || "").toUpperCase();
        let isCredit = false;
        if (dcUpper === "C") isCredit = true;
        else if (dcUpper === "D") isCredit = false;
        else if (desc.toUpperCase().includes("CRED") || desc.toUpperCase().includes("REC PIX")) isCredit = true;

        const finalCents = isCredit ? Math.abs(cents) : -Math.abs(cents);
        results.push({
          date: formatDateToIso(dateStr),
          merchant: cleanMerchant(desc),
          description: `${desc}${docNo ? ` (Doc: ${docNo})` : ""}`,
          amountCents: finalCents,
          type: isCredit ? "credit" : "debit",
          account,
        });
        continue;
      }
    }

    // Standard CSV / Date format
    if (line.includes(",") || line.includes(";") || line.includes("\t")) {
      const sep = line.includes("\t") ? "\t" : line.includes(";") && !line.includes(",") ? ";" : ",";
      const cols = line.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length >= 3) {
        const [cDate, cDesc, cAmt] = cols;
        const parsedCents = cleanNumberCents(cAmt);
        if (cDate.match(/\d{1,4}[-\/\.]\d{1,2}[-\/\.]\d{1,4}/) && Math.abs(parsedCents) > 0) {
          const isCredit = parsedCents > 0;
          results.push({
            date: formatDateToIso(cDate),
            merchant: cleanMerchant(cDesc),
            description: cDesc,
            amountCents: isCredit ? Math.abs(parsedCents) : -Math.abs(parsedCents),
            type: isCredit ? "credit" : "debit",
            account,
          });
          continue;
        }
      }
    }

    // General date regex
    const stdMatch = line.match(standardDateRegex);
    if (stdMatch) {
      const [, dateStr, descRaw, amountStr, dcType] = stdMatch;
      const desc = descRaw.trim();
      const cents = cleanNumberCents(amountStr);
      if (Math.abs(cents) > 0 && desc.length > 2) {
        const isCredit = (dcType || "").toUpperCase() === "C" || cents > 0;
        results.push({
          date: formatDateToIso(dateStr),
          merchant: cleanMerchant(desc),
          description: desc,
          amountCents: isCredit ? Math.abs(cents) : -Math.abs(cents),
          type: isCredit ? "credit" : "debit",
          account,
        });
      }
    }
  }

  return { bankName, account, transactions: results };
}

/**
 * Parses binary buffers (PDF or XLSX/XLS) or plain text into transactions
 */
export async function parseStatementFileBuffer(
  buffer: Buffer | Uint8Array,
  fileName: string,
  mimeType?: string
): Promise<{ bankName: string; account: string; transactions: ParsedTransactionRow[] }> {
  const lowerName = fileName.toLowerCase();

  // 1. Excel (XLSX / XLS)
  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.SheetNames[0];
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
    return parseStatementText(csv, fileName);
  }

  // 2. PDF (Digital text extracted using unpdf - 100% pure JS, zero canvas binaries, Vercel serverless compatible)
  if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
    try {
      const pdfText = await extractText(new Uint8Array(buffer));
      const fullText = Array.isArray(pdfText.text) ? pdfText.text.join("\n") : String(pdfText.text || "");
      if (fullText.trim().length > 20) {
        return parseStatementText(fullText, fileName);
      }
    } catch (pdfErr) {
      console.warn("unpdf text extraction note:", pdfErr);
    }
  }

  // 3. Plain text / CSV / OFX fallback
  const text = Buffer.from(buffer).toString("utf-8");
  return parseStatementText(text, fileName);
}
