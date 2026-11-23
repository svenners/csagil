import { NextRequest, NextResponse, connection } from "next/server";
import { getAuthContext, assertCanMutate } from "@/lib/auth";
import { db } from "@/db";
import { transactions, categories, categoryRules, periodLocks, auditLogs } from "@/db/schema";
import { eq, and, desc, gte, lte, ilike, or, sql, isNull } from "drizzle-orm";
import { findMatchingCategoryRule } from "@/lib/categoryRulesEngine";

export async function GET(req: NextRequest) {
  await connection();
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") || "25", 10)));
    const offset = (page - 1) * pageSize;

    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type"); // 'credit' | 'debit'
    const status = searchParams.get("status"); // 'Cleared' | 'Pending' | 'Flagged'
    const query = searchParams.get("q")?.trim();

    const conditions = [eq(transactions.organizationId, auth.organizationId)];

    if (year && year !== "All") {
      const y = parseInt(year, 10);
      if (month && month !== "All") {
        const m = parseInt(month, 10);
        const mStr = String(m).padStart(2, "0");
        const lastDay = new Date(y, m, 0).getDate();
        conditions.push(gte(transactions.txDate, `${y}-${mStr}-01`));
        conditions.push(lte(transactions.txDate, `${y}-${mStr}-${String(lastDay).padStart(2, "0")}`));
      } else {
        conditions.push(gte(transactions.txDate, `${y}-01-01`));
        conditions.push(lte(transactions.txDate, `${y}-12-31`));
      }
    }

    if (startDate) conditions.push(gte(transactions.txDate, startDate));
    if (endDate) conditions.push(lte(transactions.txDate, endDate));
    if (categoryId === "uncategorized") {
      conditions.push(isNull(transactions.categoryId));
    } else if (categoryId && categoryId !== "All") {
      conditions.push(eq(transactions.categoryId, categoryId));
    }
    if (type && type !== "All") conditions.push(eq(transactions.type, type as "credit" | "debit"));
    if (status && status !== "All") conditions.push(eq(transactions.status, status as any));

    if (query) {
      conditions.push(
        or(
          ilike(transactions.merchant, `%${query}%`),
          ilike(transactions.description, `%${query}%`),
          ilike(transactions.notes, `%${query}%`),
          ilike(transactions.accountName, `%${query}%`)
        )!
      );
    }

    const whereClause = and(...conditions);

    // Count total items
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(whereClause);

    const totalCount = countResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    // Fetch paginated transactions with category name & styling joined
    const rows = await db
      .select({
        id: transactions.id,
        txDate: transactions.txDate,
        merchant: transactions.merchant,
        description: transactions.description,
        amountCents: transactions.amountCents,
        type: transactions.type,
        status: transactions.status,
        accountName: transactions.accountName,
        notes: transactions.notes,
        googleDriveUrl: transactions.googleDriveUrl,
        googleDriveFileName: transactions.googleDriveFileName,
        googleDriveFileId: transactions.googleDriveFileId,
        linkedInvoiceId: transactions.linkedInvoiceId,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryBgColor: categories.bgColor,
        categoryTextColor: categories.textColor,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(whereClause)
      .orderBy(desc(transactions.txDate), desc(transactions.createdAt))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
      isAccountant: auth.isAccountant,
    });
  } catch (error: any) {
    console.error("Transactions GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch transactions" }, { status: 500 });
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
    const {
      txDate,
      merchant,
      description,
      amountCents,
      type,
      status = "Cleared",
      accountName = "Conta Corrente",
      categoryId,
      notes,
      googleDriveUrl,
      googleDriveFileName,
    } = body;

    if (!txDate || !merchant || amountCents === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if month is locked
    const [y, m] = txDate.split("-").map(Number);
    const lock = await db.query.periodLocks.findFirst({
      where: and(
        eq(periodLocks.organizationId, auth.organizationId),
        eq(periodLocks.year, y),
        eq(periodLocks.month, m)
      ),
    });

    if (lock) {
      return NextResponse.json(
        { error: `MONTH_LOCKED: The period ${m}/${y} is locked by ${lock.lockedBy}. Modifying entries is forbidden.` },
        { status: 403 }
      );
    }

    const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let finalCategoryId = categoryId || null;
    if (!finalCategoryId) {
      const activeRules = await db.query.categoryRules.findMany({
        where: eq(categoryRules.organizationId, auth.organizationId),
        orderBy: (r, { asc }) => [asc(r.priority)],
      });
      const matched = findMatchingCategoryRule(
        merchant,
        description || merchant,
        activeRules.map((r) => ({
          id: r.id,
          keyword: r.keyword,
          matchType: r.matchType,
          matchField: r.matchField,
          targetCategoryId: r.targetCategoryId,
        })),
        googleDriveFileName || ""
      );
      if (matched) {
        finalCategoryId = matched;
      }
    }

    const finalAmount = type === "credit" ? Math.abs(amountCents) : -Math.abs(amountCents);

    await db.insert(transactions).values({
      id: txId,
      organizationId: auth.organizationId,
      txDate,
      merchant: merchant.trim(),
      description: (description || merchant).trim(),
      amountCents: finalAmount,
      type: type || (finalAmount >= 0 ? "credit" : "debit"),
      status,
      accountName,
      categoryId: finalCategoryId,
      notes,
      googleDriveUrl,
      googleDriveFileName,
      createdBy: auth.email,
    });

    await db.insert(auditLogs).values({
      id: `audit-${Date.now()}`,
      organizationId: auth.organizationId,
      actorId: auth.userId,
      actorEmail: auth.email,
      action: "create",
      entityType: "transaction",
      entityId: txId,
      diffJson: { merchant, amountCents: finalAmount, txDate },
    });

    return NextResponse.json({ success: true, id: txId });
  } catch (error: any) {
    console.error("Transactions POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create transaction" }, { status: error.message?.includes("FORBIDDEN") ? 403 : 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    assertCanMutate(auth);

    const body = await req.json();
    const { id, categoryId, status, notes, googleDriveUrl, googleDriveFileName } = body;

    if (!id) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const existing = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.organizationId, auth.organizationId)),
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const updates: any = { updatedAt: new Date() };
    if (categoryId !== undefined) updates.categoryId = categoryId;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (googleDriveUrl !== undefined) updates.googleDriveUrl = googleDriveUrl;
    if (googleDriveFileName !== undefined) updates.googleDriveFileName = googleDriveFileName;

    await db
      .update(transactions)
      .set(updates)
      .where(and(eq(transactions.id, id), eq(transactions.organizationId, auth.organizationId)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update transaction" }, { status: 500 });
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
    const id = searchParams.get("id");
    const idsParam = searchParams.get("ids");

    if (id) {
      await db
        .delete(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.organizationId, auth.organizationId)));
      return NextResponse.json({ success: true, deleted: 1 });
    }

    if (idsParam) {
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      for (const singleId of ids) {
        await db
          .delete(transactions)
          .where(and(eq(transactions.id, singleId), eq(transactions.organizationId, auth.organizationId)));
      }
      return NextResponse.json({ success: true, deleted: ids.length });
    }

    return NextResponse.json({ error: "No transaction ID(s) provided" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete transaction" }, { status: 500 });
  }
}
