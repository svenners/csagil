import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { transactions, invoices, categories, companySettings } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || String(new Date().getFullYear());
    const month = searchParams.get("month") ? searchParams.get("month")!.padStart(2, "0") : String(new Date().getMonth() + 1).padStart(2, "0");

    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;

    const settings = await db.query.companySettings.findFirst({
      where: eq(companySettings.organizationId, auth.organizationId),
    });

    const txRows = await db
      .select({
        id: transactions.id,
        date: transactions.txDate,
        merchant: transactions.merchant,
        description: transactions.description,
        amountCents: transactions.amountCents,
        type: transactions.type,
        status: transactions.status,
        accountName: transactions.accountName,
        categoryName: categories.name,
        notes: transactions.notes,
        googleDriveUrl: transactions.googleDriveUrl,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.organizationId, auth.organizationId),
          gte(transactions.txDate, startDate),
          lte(transactions.txDate, endDate)
        )
      );

    const invRows = await db.query.invoices.findMany({
      where: and(
        eq(invoices.organizationId, auth.organizationId),
        gte(invoices.issueDate, startDate),
        lte(invoices.issueDate, endDate)
      ),
    });

    // Generate multi-sheet Excel Workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Transactions Ledger
    const ledgerData = txRows.map((t) => ({
      Data: t.date,
      "Favorecido / Fornecedor": t.merchant,
      "Descrição / Histórico": t.description,
      Categoria: t.categoryName || "Unassigned",
      "Valor (R$)": t.amountCents / 100,
      Tipo: t.type === "credit" ? "Receita" : "Despesa",
      Status: t.status,
      Conta: t.accountName,
      Observações: t.notes || "",
      "Comprovante Drive": t.googleDriveUrl || "",
    }));
    const ledgerSheet = XLSX.utils.json_to_sheet(ledgerData);
    XLSX.utils.book_append_sheet(workbook, ledgerSheet, "Livro_Caixa");

    // Sheet 2: Invoices Issued
    const invoiceData = invRows.map((i) => {
      const snap: any = i.customerSnapshot || {};
      const tax: any = i.taxSummary || {};
      return {
        Número: i.number,
        Série: i.series,
        Tipo: i.type,
        Emissão: i.issueDate,
        "Tomador / Cliente": snap.name || "",
        "CNPJ / CPF": snap.document || "",
        "Valor Bruto (R$)": i.totalGrossCents / 100,
        "Descontos (R$)": i.totalDiscountCents / 100,
        "Retenções Tributárias (R$)": i.totalWithheldCents / 100,
        "Valor Líquido (R$)": i.totalNetCents / 100,
        "ISSQN (R$)": (tax.totalIssCents || 0) / 100,
        "PIS (R$)": (tax.totalPisCents || 0) / 100,
        "COFINS (R$)": (tax.totalCofinsCents || 0) / 100,
        "CSLL (R$)": (tax.totalCsllCents || 0) / 100,
        "IRRF (R$)": (tax.totalIrrfCents || 0) / 100,
        "Chave / Verificação": i.accessKey || i.verificationCode || "",
      };
    });
    const invoiceSheet = XLSX.utils.json_to_sheet(invoiceData);
    XLSX.utils.book_append_sheet(workbook, invoiceSheet, "Notas_Fiscais");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const filename = `Fechamento_Mensal_${settings?.legalName?.replace(/[^a-zA-Z0-9]/g, "_") || "CSAgil"}_${year}_${month}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate closing package" }, { status: 500 });
  }
}
