import QRCode from "qrcode";

export interface BrazilianBank {
  code: string;
  name: string;
  shortName: string;
}

export const BRAZILIAN_BANKS: BrazilianBank[] = [
  { code: "001", name: "001 - Banco do Brasil S.A.", shortName: "Banco do Brasil" },
  { code: "033", name: "033 - Banco Santander (Brasil) S.A.", shortName: "Santander" },
  { code: "104", name: "104 - Caixa Econômica Federal", shortName: "Caixa Econômica" },
  { code: "237", name: "237 - Banco Bradesco S.A.", shortName: "Bradesco" },
  { code: "260", name: "260 - Nu Pagamentos S.A. (Nubank)", shortName: "Nubank" },
  { code: "341", name: "341 - Itaú Unibanco S.A.", shortName: "Itaú Unibanco" },
  { code: "077", name: "077 - Banco Inter S.A.", shortName: "Banco Inter" },
  { code: "336", name: "336 - Banco C6 S.A.", shortName: "C6 Bank" },
  { code: "748", name: "748 - Banco Cooperativo Sicredi S.A.", shortName: "Sicredi" },
  { code: "756", name: "756 - Banco Cooperativo Sicoob S.A.", shortName: "Sicoob" },
  { code: "290", name: "290 - PagBank PagSeguro", shortName: "PagBank" },
  { code: "380", name: "380 - PicPay Serviços S.A.", shortName: "PicPay" },
  { code: "041", name: "041 - Banrisul", shortName: "Banrisul" },
  { code: "422", name: "422 - Banco Safra S.A.", shortName: "Safra" },
  { code: "999", name: "999 - Outra Instituição Financeira", shortName: "Outro" },
];

export const BRAZILIAN_STATES = [
  { uf: "AC", name: "Acre", ibge: "12" },
  { uf: "AL", name: "Alagoas", ibge: "27" },
  { uf: "AP", name: "Amapá", ibge: "16" },
  { uf: "AM", name: "Amazonas", ibge: "13" },
  { uf: "BA", name: "Bahia", ibge: "29" },
  { uf: "CE", name: "Ceará", ibge: "23" },
  { uf: "DF", name: "Distrito Federal", ibge: "53" },
  { uf: "ES", name: "Espírito Santo", ibge: "32" },
  { uf: "GO", name: "Goiás", ibge: "52" },
  { uf: "MA", name: "Maranhão", ibge: "21" },
  { uf: "MT", name: "Mato Grosso", ibge: "51" },
  { uf: "MS", name: "Mato Grosso do Sul", ibge: "50" },
  { uf: "MG", name: "Minas Gerais", ibge: "31" },
  { uf: "PA", name: "Pará", ibge: "15" },
  { uf: "PB", name: "Paraíba", ibge: "25" },
  { uf: "PR", name: "Paraná", ibge: "41" },
  { uf: "PE", name: "Pernambuco", ibge: "26" },
  { uf: "PI", name: "Piauí", ibge: "22" },
  { uf: "RJ", name: "Rio de Janeiro", ibge: "33" },
  { uf: "RN", name: "Rio Grande do Norte", ibge: "24" },
  { uf: "RS", name: "Rio Grande do Sul", ibge: "43" },
  { uf: "RO", name: "Rondônia", ibge: "11" },
  { uf: "RR", name: "Roraima", ibge: "14" },
  { uf: "SC", name: "Santa Catarina", ibge: "42" },
  { uf: "SP", name: "São Paulo", ibge: "35" },
  { uf: "SE", name: "Sergipe", ibge: "28" },
  { uf: "TO", name: "Tocantins", ibge: "17" },
];

export function getUfIbgeCode(uf: string): string {
  const found = BRAZILIAN_STATES.find((s) => s.uf.toUpperCase() === (uf || "").toUpperCase().trim());
  return found ? found.ibge : "35"; // default to SP (35) if unknown
}

// Document sanitization and formatting
export function cleanDocument(doc: string): string {
  return (doc || "").replace(/\D/g, "");
}

export function formatCpf(val: string): string {
  const digits = cleanDocument(val).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatCnpj(val: string): string {
  const digits = cleanDocument(val).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatDocument(val: string, personType?: "PJ" | "PF"): string {
  const digits = cleanDocument(val);
  if (personType === "PF" || digits.length <= 11) {
    return formatCpf(digits);
  }
  return formatCnpj(digits);
}

export function formatCep(val: string): string {
  const digits = cleanDocument(val).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatPhone(val: string): string {
  const digits = cleanDocument(val).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function validateCpf(cpf: string): boolean {
  const digits = cleanDocument(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(10), 10)) return false;

  return true;
}

export function validateCnpj(cnpj: string): boolean {
  const digits = cleanDocument(cnpj);
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let size = digits.length - 2;
  let numbers = digits.substring(0, size);
  const checkDigits = digits.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(checkDigits.charAt(0), 10)) return false;

  size = size + 1;
  numbers = digits.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(checkDigits.charAt(1), 10)) return false;

  return true;
}

// Exact money currency formatting (accepts integer centavos or standard float number)
export function formatCurrencyCents(
  cents: number,
  currency: string = "BRL",
  locale: string = "pt-BR"
): string {
  const val = (cents || 0) / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Generate realistic Brazilian NF-e 44-digit Access Key
export function generateNfeAccessKey(params: {
  uf: string;
  issueDate: string;
  cnpj: string;
  model?: string;
  series?: string;
  invoiceNumber: number;
}): string {
  const ufCode = getUfIbgeCode(params.uf);
  const cleanC = cleanDocument(params.cnpj).padStart(14, "0");
  const d = new Date(params.issueDate || Date.now());
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const s = String(parseInt(params.series || "1", 10) || 1).padStart(3, "0");
  const num = String(params.invoiceNumber).padStart(9, "0");
  const tpEmis = "1"; // Normal emission
  const cNF = String(Math.floor(10000000 + Math.random() * 90000000));
  const baseKey = `${ufCode.padStart(2, "35")}${yy}${mm}${cleanC}${params.model || "55"}${s}${num}${tpEmis}${cNF}`;

  // Modulo 11 check digit for NF-e access key
  let multiplier = 2;
  let sum = 0;
  for (let i = baseKey.length - 1; i >= 0; i--) {
    sum += parseInt(baseKey.charAt(i), 10) * multiplier;
    multiplier = multiplier >= 9 ? 2 : multiplier + 1;
  }
  const rem = sum % 11;
  const dv = rem === 0 || rem === 1 ? 0 : 11 - rem;

  return `${baseKey}${dv}`;
}

export function formatAccessKey(key: string): string {
  if (!key) return "";
  return key.replace(/(\d{4})/g, "$1 ").trim();
}

// CRC16-CCITT calculation for BACEN / EMV QRCPS-MPM standard
export function calculatePixCRC16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function emvTLV(id: string, val: string): string {
  // Use UTF-8 byte length to prevent multi-byte character length mismatches
  const len = String(new TextEncoder().encode(val).length).padStart(2, "0");
  return `${id}${len}${val}`;
}

/**
 * Generates official BACEN standard PIX "Copia e Cola" (BR Code)
 * Fixes csfinance bug: static keys MUST have Point of Initiation Tag 01 = '11', even when amount is included!
 */
export function generatePixCopiaECola(params: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amountCents?: number;
  txId?: string;
}): string {
  let key = (params.pixKey || "").trim();
  if (!key) return "";

  // Normalize CPF/CNPJ or Phone numbers to BACEN standard
  if (/^\d{2,3}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(key) || /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(key)) {
    key = cleanDocument(key);
  } else if (/^\(?\d{2}\)?\s*9?\d{4}-?\d{4}$/.test(key)) {
    const digits = cleanDocument(key);
    key = digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
  }

  // Name: max 25 chars, uppercase, alphanumeric/clean
  const name = (params.merchantName || "CS AGIL FINANCE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .slice(0, 25)
    .trim();

  // City: max 15 chars, uppercase
  const city = (params.merchantCity || "SAO PAULO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .slice(0, 15)
    .trim();

  const txId = (params.txId || "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";

  // Tag 26: Merchant Account Information
  const gui = emvTLV("00", "br.gov.bcb.pix");
  const keyField = emvTLV("01", key);
  const merchantAccountInfo = emvTLV("26", `${gui}${keyField}`);

  let payload = "";
  payload += emvTLV("00", "01"); // Format Indicator
  // Tag 01: '11' = Static QR Code (Standard for personal/business static key with optional value)
  payload += emvTLV("01", "11");
  payload += merchantAccountInfo;
  payload += emvTLV("52", "0000"); // Merchant Category Code
  payload += emvTLV("53", "986"); // Currency: 986 = BRL

  if (params.amountCents && params.amountCents > 0) {
    const amtStr = (params.amountCents / 100).toFixed(2);
    payload += emvTLV("54", amtStr);
  }

  payload += emvTLV("58", "BR"); // Country Code
  payload += emvTLV("59", name);
  payload += emvTLV("60", city);

  // Tag 62: Additional Data Field (TxId)
  const txField = emvTLV("05", txId);
  payload += emvTLV("62", txField);

  // Tag 63: CRC16
  const beforeCrc = `${payload}6304`;
  const crc = calculatePixCRC16(beforeCrc);

  return `${beforeCrc}${crc}`;
}

export async function generatePixQrCodeDataUrl(pixPayload: string): Promise<string> {
  if (!pixPayload) return "";
  try {
    return await QRCode.toDataURL(pixPayload, {
      width: 320,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch (err) {
    console.error("Failed to generate PIX QR code data URL:", err);
    return "";
  }
}

// Comprehensive Brazilian Fiscal Tax Calculator
export interface InvoiceItemTaxInput {
  type: "service" | "product";
  unitPriceCents: number;
  quantity: number;
  discountCents?: number;
  // Service rates (basis points: 200 = 2.00%)
  issBps?: number;
  issWithheld?: boolean;
  csllBps?: number;
  irrfBps?: number;
  inssBps?: number;
  // Product rates
  icmsBps?: number;
  ipiBps?: number;
  // Shared Federal
  pisBps?: number;
  cofinsBps?: number;
}

export interface TaxCalculationResult {
  totalGrossCents: number;
  totalDiscountCents: number;
  baseAmountCents: number;
  totalIssCents: number;
  totalIssWithheldCents: number;
  totalPisCents: number;
  totalCofinsCents: number;
  totalCsllCents: number;
  totalIrrfCents: number;
  totalInssCents: number;
  totalIcmsCents: number;
  totalIpiCents: number;
  totalTaxesWithheldCents: number;
  totalApproximateTaxesCents: number; // Lei 12.741/2012 (IBPT)
  totalNetCents: number; // Net payable = Gross - Discount - Withheld Taxes
}

export function calculateInvoiceTaxes(items: InvoiceItemTaxInput[]): TaxCalculationResult {
  let totalGrossCents = 0;
  let totalDiscountCents = 0;
  let totalIssCents = 0;
  let totalIssWithheldCents = 0;
  let totalPisCents = 0;
  let totalCofinsCents = 0;
  let totalCsllCents = 0;
  let totalIrrfCents = 0;
  let totalInssCents = 0;
  let totalIcmsCents = 0;
  let totalIpiCents = 0;
  let totalApproximateTaxesCents = 0;

  for (const it of items) {
    const lineGross = it.unitPriceCents * (it.quantity || 1);
    const lineDisc = it.discountCents || 0;
    const lineNet = Math.max(0, lineGross - lineDisc);

    totalGrossCents += lineGross;
    totalDiscountCents += lineDisc;

    if (it.type === "service") {
      const issBps = it.issBps !== undefined ? it.issBps : 200; // 2.0%
      const iss = Math.round((lineNet * issBps) / 10000);
      totalIssCents += iss;
      if (it.issWithheld) {
        totalIssWithheldCents += iss;
      }

      if (it.csllBps) totalCsllCents += Math.round((lineNet * it.csllBps) / 10000);
      if (it.irrfBps) totalIrrfCents += Math.round((lineNet * it.irrfBps) / 10000);
      if (it.inssBps) totalInssCents += Math.round((lineNet * it.inssBps) / 10000);

      // Estimated IBPT transparency: ~13.45% for general services
      totalApproximateTaxesCents += Math.round(lineNet * 0.1345);
    } else {
      const icmsBps = it.icmsBps !== undefined ? it.icmsBps : 1800; // 18.0%
      totalIcmsCents += Math.round((lineNet * icmsBps) / 10000);
      if (it.ipiBps) totalIpiCents += Math.round((lineNet * it.ipiBps) / 10000);

      // Estimated IBPT transparency: ~31.5% for general goods
      totalApproximateTaxesCents += Math.round(lineNet * 0.3150);
    }

    if (it.pisBps) totalPisCents += Math.round((lineNet * it.pisBps) / 10000);
    if (it.cofinsBps) totalCofinsCents += Math.round((lineNet * it.cofinsBps) / 10000);
  }

  const baseAmountCents = Math.max(0, totalGrossCents - totalDiscountCents);
  const totalTaxesWithheldCents =
    totalIssWithheldCents + totalPisCents + totalCofinsCents + totalCsllCents + totalIrrfCents + totalInssCents;

  // Net amount payable by customer: Gross minus discounts and minus retained/withheld taxes
  const totalNetCents = Math.max(0, baseAmountCents - totalTaxesWithheldCents);

  return {
    totalGrossCents,
    totalDiscountCents,
    baseAmountCents,
    totalIssCents,
    totalIssWithheldCents,
    totalPisCents,
    totalCofinsCents,
    totalCsllCents,
    totalIrrfCents,
    totalInssCents,
    totalIcmsCents,
    totalIpiCents,
    totalTaxesWithheldCents,
    totalApproximateTaxesCents,
    totalNetCents,
  };
}

// BrasilAPI Integration: Free CNPJ and CEP live lookups
export async function lookupBrasilApiCnpj(cnpj: string): Promise<any | null> {
  const digits = cleanDocument(cnpj);
  if (digits.length !== 14) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      headers: { "User-Agent": "csagil-finance-app" },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("BrasilAPI CNPJ lookup notice:", e);
  }
  return null;
}

export async function lookupBrasilApiCep(cep: string): Promise<any | null> {
  const digits = cleanDocument(cep);
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, {
      headers: { "User-Agent": "csagil-finance-app" },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("BrasilAPI CEP lookup notice:", e);
  }
  return null;
}
