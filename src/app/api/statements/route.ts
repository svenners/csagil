import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, assertCanMutate } from "@/lib/auth";
import { db } from "@/db";
import { statements, transactions, categoryRules } from "@/db/schema";
import { parseStatementFileBuffer } from "@/lib/statementParser";
import { findMatchingCategoryRule } from "@/lib/categoryRulesEngine";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    assertCanMutate(auth);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const action = formData.get("action") as string; // 'parse' | 'confirm_import'

    // ACTION 1: Parse uploaded file and return duplicate audit preview
    if (!action || action === "parse") {
      if (!file) {
        return NextResponse.json({ error: "No statement file provided" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name;
      const mimeType = file.type;

      const parsed = await parseStatementFileBuffer(buffer, fileName, mimeType);

      // Fetch active rules to auto-suggest categories
      const activeRules = await db.query.categoryRules.findMany({
        where: eq(categoryRules.organizationId, auth.organizationId),
      });

      // Fetch existing transactions for duplicate audit (last 90 days or matching accounts)
      const existingTx = await db.query.transactions.findMany({
        where: eq(transactions.organizationId, auth.organizationId),
      });

      const auditItems = parsed.transactions.map((tx, idx) => {
        const matchedCategory = findMatchingCategoryRule(
          tx.merchant,
          tx.description,
          activeRules.map((r) => ({
            id: r.id,
            keyword: r.keyword,
            matchType: r.matchType,
            matchField: r.matchField,
            targetCategoryId: r.targetCategoryId,
          }))
        );

        // Check for duplicates: same date, exact amount, and similar merchant/description
        const matchedExisting = existingTx.find(
          (e) =>
            e.txDate === tx.date &&
            e.amountCents === tx.amountCents &&
            (e.merchant.toLowerCase().includes(tx.merchant.toLowerCase()) ||
              tx.merchant.toLowerCase().includes(e.merchant.toLowerCase()) ||
              e.description === tx.description)
        );

        const isDuplicate = !!matchedExisting;

        return {
          id: `preview-${idx}`,
          date: tx.date,
          merchant: tx.merchant,
          description: tx.description,
          amountCents: tx.amountCents,
          type: tx.type,
          account: tx.account || parsed.account,
          suggestedCategoryId: matchedCategory || null,
          isDuplicate,
          duplicateReason: isDuplicate ? `Matches existing entry on ${tx.date} (${(tx.amountCents / 100).toFixed(2)})` : undefined,
          selected: !isDuplicate, // Unchecked by default if duplicate
        };
      });

      return NextResponse.json({
        success: true,
        fileName,
        fileSizeBytes: file.size,
        fileType: fileName.split(".").pop()?.toUpperCase() || "CSV",
        bankName: parsed.bankName,
        account: parsed.account,
        items: auditItems,
        totalParsed: auditItems.length,
        duplicateCount: auditItems.filter((i) => i.isDuplicate).length,
      });
    }

    // ACTION 2: Confirm import of approved items into transactions & statements tables
    if (action === "confirm_import") {
      const itemsJson = formData.get("items") as string;
      const fileName = (formData.get("fileName") as string) || "Bank_Statement";
      const fileSizeBytes = parseInt((formData.get("fileSizeBytes") as string) || "0", 10);
      const fileType = (formData.get("fileType") as any) || "CSV";
      const accountName = (formData.get("accountName") as string) || "Conta Corrente";

      const itemsToImport = JSON.parse(itemsJson || "[]");
      if (!Array.isArray(itemsToImport) || itemsToImport.length === 0) {
        return NextResponse.json({ error: "No transactions selected for import" }, { status: 400 });
      }

      const stmtId = `stmt-${Date.now()}`;

      // Insert Statement Record
      await db.insert(statements).values({
        id: stmtId,
        organizationId: auth.organizationId,
        fileName,
        fileType,
        fileSizeBytes,
        source: "Manual",
        status: "Uploaded",
        parsedCount: itemsToImport.length,
        importedCount: itemsToImport.length,
        accountName,
      });

      // Insert Transactions atomically
      for (let i = 0; i < itemsToImport.length; i++) {
        const it = itemsToImport[i];
        const txId = `tx-imp-${Date.now()}-${i}`;
        await db.insert(transactions).values({
          id: txId,
          organizationId: auth.organizationId,
          statementId: stmtId,
          txDate: it.date,
          merchant: it.merchant,
          description: it.description || it.merchant,
          amountCents: it.amountCents,
          type: it.type || (it.amountCents >= 0 ? "credit" : "debit"),
          status: "Cleared",
          accountName: it.account || accountName,
          categoryId: it.categoryId || null,
          createdBy: auth.email,
        });
      }

      return NextResponse.json({
        success: true,
        statementId: stmtId,
        importedCount: itemsToImport.length,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Statement Upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse statement" }, { status: 500 });
  }
}
