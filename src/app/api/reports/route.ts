import { NextRequest, NextResponse, connection } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { transactions, invoices, categories } from "@/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  await connection();
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "quarter"; // 'month' | 'quarter' | 'ytd' | 'all'
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const now = new Date();
    const curYear = year && year !== "All" ? parseInt(year, 10) : now.getFullYear();
    let startDate = `${curYear}-01-01`;
    let endDate = `${curYear}-12-31`;

    if (period === "month") {
      const curMonth = month && month !== "All" ? parseInt(month, 10) : now.getMonth() + 1;
      const mStr = String(curMonth).padStart(2, "0");
      const lastDay = new Date(curYear, curMonth, 0).getDate();
      startDate = `${curYear}-${mStr}-01`;
      endDate = `${curYear}-${mStr}-${String(lastDay).padStart(2, "0")}`;
    } else if (period === "quarter") {
      const curQuarter = Math.floor(now.getMonth() / 3);
      const startM = curQuarter * 3 + 1;
      const endM = curQuarter * 3 + 3;
      const lastDay = new Date(curYear, endM, 0).getDate();
      startDate = `${curYear}-${String(startM).padStart(2, "0")}-01`;
      endDate = `${curYear}-${String(endM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else if (period === "ytd") {
      startDate = `${curYear}-01-01`;
      endDate = `${curYear}-12-31`;
    }

    const conditions = [
      eq(transactions.organizationId, auth.organizationId),
      gte(transactions.txDate, startDate),
      lte(transactions.txDate, endDate),
    ];

    const whereClause = and(...conditions);

    // 1. KPI Aggregations (Income, Expenses, Net Balance)
    const [kpiResult] = await db
      .select({
        totalIncomeCents: sql<number>`coalesce(sum(case when ${transactions.amountCents} > 0 then ${transactions.amountCents} else 0 end), 0)::bigint`,
        totalExpenseCents: sql<number>`coalesce(sum(case when ${transactions.amountCents} < 0 then abs(${transactions.amountCents}) else 0 end), 0)::bigint`,
        txCount: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(whereClause);

    const income = Number(kpiResult?.totalIncomeCents || 0);
    const expenses = Number(kpiResult?.totalExpenseCents || 0);
    const netBalance = income - expenses;

    // 2. Monthly Inflow vs Outflow Cash Flow Data
    const monthlyCashFlow = await db
      .select({
        month: sql<string>`to_char(${transactions.txDate}::date, 'YYYY-MM')`,
        inflowCents: sql<number>`coalesce(sum(case when ${transactions.amountCents} > 0 then ${transactions.amountCents} else 0 end), 0)::bigint`,
        outflowCents: sql<number>`coalesce(sum(case when ${transactions.amountCents} < 0 then abs(${transactions.amountCents}) else 0 end), 0)::bigint`,
      })
      .from(transactions)
      .where(and(eq(transactions.organizationId, auth.organizationId), gte(transactions.txDate, `${now.getFullYear()}-01-01`)))
      .groupBy(sql`to_char(${transactions.txDate}::date, 'YYYY-MM')`)
      .orderBy(sql`to_char(${transactions.txDate}::date, 'YYYY-MM')`);

    // 3. Category Spending Breakdown
    const categoryBreakdown = await db
      .select({
        categoryName: sql<string>`coalesce(${categories.name}, 'Unassigned')`,
        categoryColor: sql<string>`coalesce(${categories.color}, '#4a7c59')`,
        categoryBgColor: sql<string>`coalesce(${categories.bgColor}, '#e8ead1')`,
        totalSpentCents: sql<number>`sum(abs(${transactions.amountCents}))::bigint`,
        txCount: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(whereClause, eq(transactions.type, "debit")))
      .groupBy(categories.name, categories.color, categories.bgColor)
      .orderBy(desc(sql`sum(abs(${transactions.amountCents}))`));

    // 4. Brazilian Tax Withholdings Summary (from Invoices in this period)
    const invList = await db.query.invoices.findMany({
      where: and(
        eq(invoices.organizationId, auth.organizationId),
        gte(invoices.issueDate, startDate),
        lte(invoices.issueDate, endDate)
      ),
    });

    let totalBilledCents = 0;
    let totalIssCents = 0;
    let totalIssWithheldCents = 0;
    let totalPisCents = 0;
    let totalCofinsCents = 0;
    let totalCsllCents = 0;
    let totalIrrfCents = 0;
    let totalInssCents = 0;
    let totalIcmsCents = 0;

    for (const inv of invList) {
      totalBilledCents += inv.totalGrossCents;
      const ts: any = inv.taxSummary || {};
      totalIssCents += ts.totalIssCents || 0;
      totalIssWithheldCents += ts.totalIssWithheldCents || 0;
      totalPisCents += ts.totalPisCents || 0;
      totalCofinsCents += ts.totalCofinsCents || 0;
      totalCsllCents += ts.totalCsllCents || 0;
      totalIrrfCents += ts.totalIrrfCents || 0;
      totalInssCents += ts.totalInssCents || 0;
      totalIcmsCents += ts.totalIcmsCents || 0;
    }

    // 5. Top Merchant
    const [topMerchantRow] = await db
      .select({
        merchant: transactions.merchant,
        totalCents: sql<number>`sum(abs(${transactions.amountCents}))::bigint`,
      })
      .from(transactions)
      .where(and(whereClause, eq(transactions.type, "debit")))
      .groupBy(transactions.merchant)
      .orderBy(desc(sql`sum(abs(${transactions.amountCents}))`))
      .limit(1);

    return NextResponse.json({
      success: true,
      period: { startDate, endDate, label: period },
      kpis: {
        totalIncomeCents: income,
        totalExpenseCents: expenses,
        netBalanceCents: netBalance,
        transactionCount: kpiResult?.txCount || 0,
        topMerchant: topMerchantRow?.merchant || "None",
        topMerchantCents: Number(topMerchantRow?.totalCents || 0),
        netOperatingSurplusCents: netBalance > 0 ? netBalance : 0,
      },
      cashFlow: monthlyCashFlow.map((m) => ({
        month: m.month,
        inflowCents: Number(m.inflowCents),
        outflowCents: Number(m.outflowCents),
      })),
      categoryBreakdown: categoryBreakdown.map((c) => ({
        name: c.categoryName,
        color: c.categoryColor,
        bgColor: c.categoryBgColor,
        spentCents: Number(c.totalSpentCents),
        count: c.txCount,
        percentage: expenses > 0 ? Math.round((Number(c.totalSpentCents) / expenses) * 100) : 0,
      })),
      taxSummary: {
        invoiceCount: invList.length,
        totalBilledCents,
        totalIssCents,
        totalIssWithheldCents,
        totalPisCents,
        totalCofinsCents,
        totalCsllCents,
        totalIrrfCents,
        totalInssCents,
        totalIcmsCents,
        totalWithheldCents:
          totalIssWithheldCents + totalPisCents + totalCofinsCents + totalCsllCents + totalIrrfCents + totalInssCents,
      },
    });
  } catch (error: any) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: error.message || "Failed to calculate reports" }, { status: 500 });
  }
}
