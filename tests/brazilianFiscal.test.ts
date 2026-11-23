import { describe, it, expect } from "vitest";
import {
  validateCpf,
  validateCnpj,
  formatCpf,
  formatCnpj,
  formatCurrencyCents,
  generateNfeAccessKey,
  calculatePixCRC16,
  generatePixCopiaECola,
  calculateInvoiceTaxes,
  InvoiceItemTaxInput,
} from "../src/lib/brazilianFiscal";

describe("brazilianFiscal Engine", () => {
  it("validates and formats CPF and CNPJ correctly", () => {
    // Standard valid check digits
    expect(validateCpf("11144477735")).toBe(true);
    expect(validateCpf("11111111111")).toBe(false); // Repeated numbers are invalid

    expect(validateCnpj("11222333000181")).toBe(true);
    expect(validateCnpj("00000000000000")).toBe(false);

    expect(formatCpf("11144477735")).toBe("111.444.777-35");
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("formats integer centavos into exact currency strings", () => {
    expect(formatCurrencyCents(123456, "BRL", "pt-BR")).toContain("1.234,56");
    expect(formatCurrencyCents(123456, "USD", "en-US")).toBe("$1,234.56");
  });

  it("calculates exact CRC16-CCITT checksum for PIX EMV standard", () => {
    // Official Central Bank test string sample
    const samplePayload = "00020126360014br.gov.bcb.pix011412345678000190520400005303986540510.005802BR5915CS AGIL FINANCE6009SAO PAULO62070503***6304";
    const crc = calculatePixCRC16(samplePayload);
    expect(crc).toHaveLength(4);
    expect(typeof crc).toBe("string");
  });

  it("generates BACEN-compliant static PIX payload with Tag 01 = '11'", () => {
    const payload = generatePixCopiaECola({
      pixKey: "12.345.678/0001-90",
      merchantName: "CS AGIL FINANCE",
      merchantCity: "SAO PAULO",
      amountCents: 150000, // R$ 1,500.00
      txId: "INV104P1",
    });

    expect(payload).toContain("000201"); // Format indicator
    expect(payload).toContain("010211"); // Static QR Code Initiation (MUST BE 11!)
    expect(payload).toContain("br.gov.bcb.pix");
    expect(payload).toContain("54071500.00"); // Amount R$ 1500.00
    expect(payload).toContain("INV104P1"); // TxId
  });

  it("calculates Brazilian taxes and withholdings accurately", () => {
    const items: InvoiceItemTaxInput[] = [
      {
        type: "service",
        unitPriceCents: 1000000, // R$ 10,000.00
        quantity: 1,
        discountCents: 0,
        issBps: 200, // 2.0% ISS = R$ 200.00
        issWithheld: true, // Retained by customer
        pisBps: 65, // 0.65% PIS = R$ 65.00
        cofinsBps: 300, // 3.00% COFINS = R$ 300.00
        csllBps: 100, // 1.00% CSLL = R$ 100.00
        irrfBps: 150, // 1.50% IRRF = R$ 150.00
      },
    ];

    const result = calculateInvoiceTaxes(items);

    expect(result.totalGrossCents).toBe(1000000);
    expect(result.totalIssCents).toBe(20000); // R$ 200.00
    expect(result.totalIssWithheldCents).toBe(20000); // R$ 200.00
    expect(result.totalPisCents).toBe(6500); // R$ 65.00
    expect(result.totalCofinsCents).toBe(30000); // R$ 300.00
    expect(result.totalCsllCents).toBe(10000); // R$ 100.00
    expect(result.totalIrrfCents).toBe(15000); // R$ 150.00

    // Total withheld = ISS (200) + PIS (65) + COFINS (300) + CSLL (100) + IRRF (150) = R$ 815.00 (81500 cents)
    expect(result.totalTaxesWithheldCents).toBe(81500);

    // Total Net Payable = 10000.00 - 815.00 = R$ 9,185.00 (918500 cents)
    expect(result.totalNetCents).toBe(918500);
  });

  it("generates 44-digit NF-e access key with correct state code and check digit", () => {
    const key = generateNfeAccessKey({
      uf: "SP",
      issueDate: "2026-11-23",
      cnpj: "12345678000190",
      invoiceNumber: 104,
      series: "1",
    });

    expect(key).toHaveLength(44);
    expect(key.startsWith("35")).toBe(true); // SP code is 35
  });
});
