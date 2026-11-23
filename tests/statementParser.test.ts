import { describe, it, expect } from "vitest";
import { parseStatementText } from "../src/lib/statementParser";

describe("statementParser Engine", () => {
  it("parses Brazilian Caixa Econômica extrato format with D/C and Saldo columns", () => {
    const sampleCaixa = `08/02/2025, 12:57 Gerenciador___CAIXa
Extrato por período
Cliente: CHARLTON SHAW
Conta: 3225 | 1292 | 000578878585-1

Data Mov. Nr. Doc. Histórico Valor Saldo
000000 SALDO ANTERIOR 0,00 73.402,33 C
02/01/2025 021034 PAG BOLETO 1.918,22 D 71.484,11 C
03/01/2025 031500 CRED PIX 7.550,24 C 79.034,35 C
10/01/2025 364299 DEBITO NET 161,95 D 78.872,40 C
10/01/2025 202412 DB T CESTA 75,00 D 78.797,40 C
`;

    const result = parseStatementText(sampleCaixa, "Caixa_Janeiro_2025.txt");
    expect(result.bankName).toBe("Caixa Econômica Federal");
    expect(result.transactions).toHaveLength(4);

    // PAG BOLETO: -1918.22 -> -191822 cents
    expect(result.transactions[0].merchant).toBe("Boleto Payment");
    expect(result.transactions[0].amountCents).toBe(-191822);
    expect(result.transactions[0].type).toBe("debit");
    expect(result.transactions[0].date).toBe("2025-01-02");

    // CRED PIX: +7550.24 -> 755024 cents
    expect(result.transactions[1].merchant).toBe("Pix Payment Received");
    expect(result.transactions[1].amountCents).toBe(755024);
    expect(result.transactions[1].type).toBe("credit");
    expect(result.transactions[1].date).toBe("2025-01-03");

    // DEBITO NET: -161.95 -> -16195 cents
    expect(result.transactions[2].merchant).toBe("Claro Telecom");
    expect(result.transactions[2].amountCents).toBe(-16195);
  });

  it("parses standard CSV bank statements with debit and credit numbers", () => {
    const csvContent = `Date,Description,Amount
2025-02-15,AWS Cloud Hosting,-840.50
2025-02-16,Client Payment Wire,4500.00
`;

    const result = parseStatementText(csvContent, "Statement.csv");
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].merchant).toBe("AWS Cloud Services");
    expect(result.transactions[0].amountCents).toBe(-84050);
    expect(result.transactions[1].amountCents).toBe(450000);
  });
});
