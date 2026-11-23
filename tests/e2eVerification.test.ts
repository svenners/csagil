import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/db";
import { organizations, transactions, categories, invoices, companySettings } from "../src/db/schema";
import { eq } from "drizzle-orm";
import {
  calculateInvoiceTaxes,
  generatePixCopiaECola,
  InvoiceItemTaxInput,
} from "../src/lib/brazilianFiscal";
import { findMatchingCategoryRule } from "../src/lib/categoryRulesEngine";
import { evaluateReceiptMatching } from "../src/lib/receiptMatcher";
import { assertCanMutate, AuthContext } from "../src/lib/auth";

describe("E2E Core Flow Verification", () => {
  const testOrgId = "org-test-e2e";

  beforeAll(async () => {
    // Ensure test organization exists
    await db
      .insert(organizations)
      .values({
        id: testOrgId,
        name: "Test E2E LTDA",
        slug: "test-e2e",
        currency: "BRL",
        locale: "pt-BR",
      })
      .onConflictDoNothing();
  });

  it("calculates Brazilian taxes and withholdings accurately", () => {
    // Service line item: 10,000.00 (1,000,000 cents)
    // ISS: 200 bps (2.0%) = 200.00 (withheld)
    // PIS: 65 bps (0.65%) = 65.00
    // COFINS: 300 bps (3.00%) = 300.00
    // CSLL: 100 bps (1.00%) = 100.00
    // IRRF: 150 bps (1.50%) = 150.00
    // Net Payable = 10,000.00 - 200.00 - 65.00 - 300.00 - 100.00 - 150.00 = 9,185.00
    const items: InvoiceItemTaxInput[] = [
      {
        description: "Serviço de Consultoria de TI",
        unitPriceCents: 1000000,
        quantity: 1,
        type: "service",
        issBps: 200,
        issWithheld: true,
        pisBps: 65,
        cofinsBps: 300,
        csllBps: 100,
        irrfBps: 150,
      },
    ];

    const calc = calculateInvoiceTaxes(items);

    expect(calc.totalGrossCents).toBe(1000000);
    expect(calc.totalIssCents).toBe(20000);
    expect(calc.totalIssWithheldCents).toBe(20000);
    expect(calc.totalPisCents).toBe(6500);
    expect(calc.totalCofinsCents).toBe(30000);
    expect(calc.totalCsllCents).toBe(10000);
    expect(calc.totalIrrfCents).toBe(15000);
    expect(calc.totalTaxesWithheldCents).toBe(81500); // 200 + 65 + 300 + 100 + 150 = 815.00
    expect(calc.totalNetCents).toBe(918500); // 10000.00 - 815.00 = 9185.00
  });

  it("generates a valid Central Bank static PIX BR Code (Tag 01 = 11)", () => {
    const payload = generatePixCopiaECola({
      pixKey: "12345678000190",
      merchantName: "CS AGIL FINANCE",
      merchantCity: "SAO PAULO",
      amountCents: 15000, // R$ 150.00
      txId: "INV101",
    });

    expect(payload).toContain("010211"); // Tag 01 length 02 value 11 (Static PIX standard)
    expect(payload).toContain("12345678000190");
    expect(payload).toContain("150.00");
    expect(payload).toContain("6304"); // CRC16 checksum tag
  });

  it("categorizes transactions matching rules across merchant, description, and file", () => {
    const rules = [
      {
        id: "r1",
        keyword: "AWS",
        matchType: "contains" as const,
        matchField: "all" as const,
        targetCategoryId: "cat-cloud",
      },
      {
        id: "r2",
        keyword: "POSTO",
        matchType: "starts_with" as const,
        matchField: "merchant" as const,
        targetCategoryId: "cat-fuel",
      },
    ];

    expect(
      findMatchingCategoryRule("AWS Cloud Services", "Monthly EC2 Hosting", rules, "")
    ).toBe("cat-cloud");

    expect(
      findMatchingCategoryRule("POSTO IPIRANGA", "Combustivel", rules, "")
    ).toBe("cat-fuel");

    expect(
      findMatchingCategoryRule("Restaurante", "Almoço", rules, "extrato_AWS_2026.csv")
    ).toBe("cat-cloud");
  });

  it("matches receipts to transactions by date horizon and amount", () => {
    const driveFiles = [
      { id: "f-1", name: "20260316_Uber_125-00.pdf", webViewLink: "https://drive.google.com/f1" },
      { id: "f-2", name: "20260320_Kalunga_50-00.pdf", webViewLink: "https://drive.google.com/f2" },
    ];

    const matches = evaluateReceiptMatching(driveFiles, "2026-03-15", 12500, "Uber");

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].id).toBe("f-1");
    expect(matches[0].isExactAmountMatch).toBe(true);
    expect(matches[0].score).toBeGreaterThanOrEqual(70);
  });

  it("strictly enforces read-only access for accountant role", () => {
    const accountantAuth: AuthContext = {
      userId: "usr-acct",
      email: "contador@escritorio.com.br",
      organizationId: testOrgId,
      role: "accountant",
      isAccountant: true,
    };

    expect(() => assertCanMutate(accountantAuth)).toThrow(
      "FORBIDDEN_ACCOUNTANT_READ_ONLY"
    );

    const ownerAuth: AuthContext = {
      userId: "usr-owner",
      email: "owner@csagil.com",
      organizationId: testOrgId,
      role: "owner",
      isAccountant: false,
    };

    expect(() => assertCanMutate(ownerAuth)).not.toThrow();
  });
});
