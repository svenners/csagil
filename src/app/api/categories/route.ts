import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, assertCanMutate } from "@/lib/auth";
import { db } from "@/db";
import { categories, categoryRules, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { findMatchingCategoryRule } from "@/lib/categoryRulesEngine";

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgCategories = await db.query.categories.findMany({
      where: eq(categories.organizationId, auth.organizationId),
      orderBy: (c, { asc }) => [asc(c.name)],
    });

    const orgRules = await db.query.categoryRules.findMany({
      where: eq(categoryRules.organizationId, auth.organizationId),
      orderBy: (r, { asc }) => [asc(r.priority)],
    });

    return NextResponse.json({
      success: true,
      categories: orgCategories,
      rules: orgRules,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    assertCanMutate(auth);

    const body = await req.json();
    const { action } = body;

    // Action 1: Create Category
    if (action === "create_category") {
      const { name, icon = "folder", color = "#4a7c59", bgColor = "#e8ead1", textColor = "#2f5c40", monthlyBudgetCents = 0, description } = body;
      const catId = `cat-${Date.now()}`;
      await db.insert(categories).values({
        id: catId,
        organizationId: auth.organizationId,
        name: name.trim(),
        icon,
        color,
        bgColor,
        textColor,
        monthlyBudgetCents,
        description,
      });
      return NextResponse.json({ success: true, id: catId });
    }

    // Action 2: Create Category Rule
    if (action === "create_rule") {
      const { keyword, matchType = "contains", matchField = "all", targetCategoryId, applyToExisting = false } = body;
      const ruleId = `rule-${Date.now()}`;

      await db.insert(categoryRules).values({
        id: ruleId,
        organizationId: auth.organizationId,
        keyword: keyword.trim(),
        matchType,
        matchField,
        targetCategoryId,
      });

      let updatedCount = 0;
      if (applyToExisting) {
        // Fetch all uncategorized or matching transactions
        const allTx = await db.query.transactions.findMany({
          where: eq(transactions.organizationId, auth.organizationId),
        });

        const activeRules = await db.query.categoryRules.findMany({
          where: eq(categoryRules.organizationId, auth.organizationId),
        });

        for (const tx of allTx) {
          const matchedId = findMatchingCategoryRule(
            tx.merchant,
            tx.description,
            activeRules.map((r) => ({
              id: r.id,
              keyword: r.keyword,
              matchType: r.matchType,
              matchField: r.matchField,
              targetCategoryId: r.targetCategoryId,
            })),
            tx.googleDriveFileName || ""
          );

          if (matchedId && matchedId !== tx.categoryId) {
            await db
              .update(transactions)
              .set({ categoryId: matchedId, updatedAt: new Date() })
              .where(eq(transactions.id, tx.id));
            updatedCount++;
          }
        }
      }

      return NextResponse.json({ success: true, id: ruleId, updatedCount });
    }

    // Action 3: Batch Apply All Active Rules
    if (action === "apply_rules_to_ledger") {
      const allTx = await db.query.transactions.findMany({
        where: eq(transactions.organizationId, auth.organizationId),
      });

      const activeRules = await db.query.categoryRules.findMany({
        where: eq(categoryRules.organizationId, auth.organizationId),
      });

      let updatedCount = 0;
      for (const tx of allTx) {
        const matchedId = findMatchingCategoryRule(
          tx.merchant,
          tx.description,
          activeRules.map((r) => ({
            id: r.id,
            keyword: r.keyword,
            matchType: r.matchType,
            matchField: r.matchField,
            targetCategoryId: r.targetCategoryId,
          })),
          tx.googleDriveFileName || ""
        );

        if (matchedId && matchedId !== tx.categoryId) {
          await db
            .update(transactions)
            .set({ categoryId: matchedId, updatedAt: new Date() })
            .where(eq(transactions.id, tx.id));
          updatedCount++;
        }
      }

      return NextResponse.json({ success: true, updatedCount });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process category action" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    assertCanMutate(auth);

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const ruleId = searchParams.get("ruleId");

    if (categoryId) {
      // Deleting category cascades rules via FK target_category_id ON DELETE CASCADE
      // Set any transactions with this category to null
      await db
        .update(transactions)
        .set({ categoryId: null })
        .where(and(eq(transactions.categoryId, categoryId), eq(transactions.organizationId, auth.organizationId)));

      await db
        .delete(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.organizationId, auth.organizationId)));

      return NextResponse.json({ success: true });
    }

    if (ruleId) {
      await db
        .delete(categoryRules)
        .where(and(eq(categoryRules.id, ruleId), eq(categoryRules.organizationId, auth.organizationId)));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No category or rule ID provided" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
  }
}
