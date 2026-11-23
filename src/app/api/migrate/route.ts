import { NextRequest, NextResponse, connection } from "next/server";
import { getAuthContext, assertCanMutate } from "@/lib/auth";
import { db } from "@/db";
import {
  transactions,
  categories,
  categoryRules,
  statements,
  customers,
  providers,
  products,
  services,
  invoices,
  companySettings,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  await connection();
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    assertCanMutate(auth);

    const backupJson = await req.json();
    const data = backupJson.data || backupJson;

    let importedCounts = {
      transactions: 0,
      categories: 0,
      rules: 0,
      customers: 0,
      providers: 0,
      products: 0,
      services: 0,
      invoices: 0,
    };

    // 1. Categories
    const categoryNameToIdMap = new Map<string, string>();
    if (Array.isArray(data.categories)) {
      for (const cat of data.categories) {
        const catId = cat.id || `cat-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        categoryNameToIdMap.set(cat.name, catId);
        await db
          .insert(categories)
          .values({
            id: catId,
            organizationId: auth.organizationId,
            name: cat.name,
            icon: cat.icon || "folder",
            color: cat.color || "#4a7c59",
            bgColor: cat.bgColor || "#e8ead1",
            textColor: cat.textColor || "#2f5c40",
            monthlyBudgetCents: 0,
          })
          .onConflictDoNothing();
        importedCounts.categories++;
      }
    }

    // Ensure we have current categories mapped
    const currentCats = await db.query.categories.findMany({
      where: eq(categories.organizationId, auth.organizationId),
    });
    currentCats.forEach((c) => categoryNameToIdMap.set(c.name, c.id));

    // 2. Category Rules
    if (Array.isArray(data.categoryRules)) {
      for (let i = 0; i < data.categoryRules.length; i++) {
        const r = data.categoryRules[i];
        const targetCatName = r.targetCategory || r.category;
        const targetId = categoryNameToIdMap.get(targetCatName);
        if (targetId) {
          await db
            .insert(categoryRules)
            .values({
              id: r.id || `rule-${Date.now()}-${i}`,
              organizationId: auth.organizationId,
              keyword: r.keyword,
              matchType: r.matchType || "contains",
              matchField: r.matchField || "all",
              targetCategoryId: targetId,
              priority: i,
            })
            .onConflictDoNothing();
          importedCounts.rules++;
        }
      }
    }

    // 3. Transactions
    if (Array.isArray(data.transactions)) {
      for (let i = 0; i < data.transactions.length; i++) {
        const tx = data.transactions[i];
        const rawDate = tx.rawDate || (tx.date && tx.date.includes("-") ? tx.date : new Date().toISOString().split("T")[0]);
        const amountCents = typeof tx.amount === "number" ? Math.round(tx.amount * 100) : 0;
        const catId = tx.category ? categoryNameToIdMap.get(tx.category) || null : null;

        await db
          .insert(transactions)
          .values({
            id: tx.id || `tx-${Date.now()}-${i}`,
            organizationId: auth.organizationId,
            txDate: rawDate,
            merchant: tx.merchant || "Transaction",
            description: tx.description || tx.merchant || "Transaction",
            amountCents,
            type: tx.type || (amountCents >= 0 ? "credit" : "debit"),
            status: tx.status || "Cleared",
            accountName: tx.account || "Conta Corrente",
            categoryId: catId,
            notes: tx.notes,
            googleDriveUrl: tx.googleDriveUrl,
            googleDriveFileName: tx.googleDriveFileName,
          })
          .onConflictDoNothing();
        importedCounts.transactions++;
      }
    }

    // 4. Customers
    const customerIdMap = new Map<string, string>();
    if (Array.isArray(data.customers)) {
      for (const c of data.customers) {
        const cId = c.id || `cust-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        customerIdMap.set(c.id, cId);
        await db
          .insert(customers)
          .values({
            id: cId,
            organizationId: auth.organizationId,
            name: c.name,
            tradeName: c.tradeName,
            document: c.document,
            email: c.email || "",
            phone: c.phone || "",
            street: c.address?.street || "",
            number: c.address?.number || "",
            neighborhood: c.address?.neighborhood || "",
            city: c.address?.city || "São Paulo",
            state: c.address?.state || "SP",
            zipCode: c.address?.zipCode || "",
            personType: c.personType || "PJ",
          })
          .onConflictDoNothing();
        importedCounts.customers++;
      }
    }

    // 5. Company Settings
    if (data.companySettings) {
      const cs = data.companySettings;
      await db
        .update(companySettings)
        .set({
          legalName: cs.legalName,
          tradeName: cs.tradeName,
          cnpj: cs.cnpj,
          municipalRegistration: cs.municipalRegistration,
          stateRegistration: cs.stateRegistration,
          taxRegime: cs.taxRegime || "simples_nacional",
          email: cs.email,
          phone: cs.phone,
          street: cs.address?.street || "",
          number: cs.address?.number || "",
          neighborhood: cs.address?.neighborhood || "",
          city: cs.address?.city || "São Paulo",
          state: cs.address?.state || "SP",
          zipCode: cs.address?.zipCode || "",
          bankName: cs.bankingDetails?.bankName || "001 - Banco do Brasil S.A.",
          pixKey: cs.bankingDetails?.pixKey || cs.pixKey,
          nextNfNumber: cs.nextNfNumber || 104,
          updatedAt: new Date(),
        })
        .where(eq(companySettings.organizationId, auth.organizationId));
    }

    return NextResponse.json({
      success: true,
      importedCounts,
      message: `Successfully migrated database from csfinance backup (${importedCounts.transactions} transactions, ${importedCounts.categories} categories, ${importedCounts.customers} customers).`,
    });
  } catch (error: any) {
    console.error("Migration import error:", error);
    return NextResponse.json({ error: error.message || "Failed to import csfinance backup" }, { status: 500 });
  }
}
