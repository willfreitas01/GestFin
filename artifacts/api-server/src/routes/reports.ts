import { Router } from "express";
import {
  db,
  transactionsTable,
  monthlyReportsTable,
  categoriesTable,
} from "@workspace/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import {
  GetMonthlyReportQueryParams,
  CloseMonthlyReportBody,
} from "@workspace/api-zod";

const router = Router();

type ByCategoryEntry = {
  category: string;
  label: string;
  total: number;
  percentage: number;
};

function monthBounds(month: string): { startDate: string; endDate: string } {
  const [year, mon] = month.split("-");
  const yearNum = parseInt(year, 10);
  const monNum = parseInt(mon, 10);
  const startDate = `${year}-${mon}-01`;
  const d = new Date(yearNum, monNum, 0);
  const endDate = `${year}-${mon}-${String(d.getDate()).padStart(2, "0")}`;
  return { startDate, endDate };
}

async function getCategoryTypeMap(
  userId: number,
): Promise<Record<string, string>> {
  const cats = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId));
  const map: Record<string, string> = {};
  for (const c of cats) map[c.name] = c.type;
  return map;
}

function isIncome(category: string, typeMap: Record<string, string>): boolean {
  if (typeMap[category]) return typeMap[category] === "income";
  return category === "venda";
}

async function computeMonthlyReport(userId: number, month: string) {
  const { startDate, endDate } = monthBounds(month);
  const typeMap = await getCategoryTypeMap(userId);

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, userId),
        gte(transactionsTable.date, startDate),
        lte(transactionsTable.date, endDate),
      ),
    )
    .orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt));

  let totalIncome = 0;
  let totalExpenses = 0;
  const byCategory: Record<string, number> = {};
  let grandTotal = 0;

  const transactions = rows.map((t) => {
    const amount = parseFloat(String(t.amount));
    if (isIncome(t.category, typeMap)) {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
    }
    byCategory[t.category] = (byCategory[t.category] ?? 0) + amount;
    grandTotal += amount;
    return {
      id: t.id,
      date: t.date,
      category: t.category,
      description: t.description,
      amount,
      createdAt: t.createdAt.toISOString(),
    };
  });

  const byCategoryArr: ByCategoryEntry[] = Object.entries(byCategory).map(
    ([category, total]) => ({
      category,
      label: category,
      total,
      percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
    }),
  );

  const balance = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

  return {
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    transactionCount: transactions.length,
    byCategory: byCategoryArr,
    transactions,
  };
}

router.get("/reports/monthly", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetMonthlyReportQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parâmetros inválidos. Use month=YYYY-MM." });
    return;
  }
  const userId = req.session.userId!;
  const { month } = parsed.data;

  const [closed] = await db
    .select()
    .from(monthlyReportsTable)
    .where(
      and(
        eq(monthlyReportsTable.userId, userId),
        eq(monthlyReportsTable.month, month),
      ),
    )
    .limit(1);

  if (closed) {
    res.json({
      month,
      closed: true,
      closedAt: closed.closedAt.toISOString(),
      totalIncome: parseFloat(String(closed.totalIncome)),
      totalExpenses: parseFloat(String(closed.totalExpenses)),
      balance: parseFloat(String(closed.balance)),
      savingsRate: closed.savingsRate,
      transactionCount: closed.transactionCount,
      byCategory: JSON.parse(closed.byCategory) as ByCategoryEntry[],
      transactions: (await computeMonthlyReport(userId, month)).transactions,
    });
    return;
  }

  const report = await computeMonthlyReport(userId, month);
  res.json({ month, closed: false, ...report });
});

router.get("/reports/months", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const rows = await db
    .selectDistinct({
      month: sql<string>`to_char(${transactionsTable.date}::date, 'YYYY-MM')`,
    })
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(sql`1 DESC`);
  res.json(rows.map((r) => r.month));
});

router.get(
  "/reports/monthly/closed",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const rows = await db
      .select({
        month: monthlyReportsTable.month,
        closedAt: monthlyReportsTable.closedAt,
      })
      .from(monthlyReportsTable)
      .where(eq(monthlyReportsTable.userId, userId))
      .orderBy(desc(monthlyReportsTable.month));
    res.json(
      rows.map((r) => ({ month: r.month, closedAt: r.closedAt.toISOString() })),
    );
  },
);

router.post(
  "/reports/monthly/close",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = CloseMonthlyReportBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Parâmetros inválidos. Envie { month: 'YYYY-MM' }." });
      return;
    }
    const userId = req.session.userId!;
    const { month } = parsed.data;

    const [existing] = await db
      .select({ id: monthlyReportsTable.id })
      .from(monthlyReportsTable)
      .where(
        and(
          eq(monthlyReportsTable.userId, userId),
          eq(monthlyReportsTable.month, month),
        ),
      )
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Este mês já foi fechado anteriormente." });
      return;
    }

    const report = await computeMonthlyReport(userId, month);
    const [saved] = await db
      .insert(monthlyReportsTable)
      .values({
        userId,
        month,
        totalIncome: String(report.totalIncome),
        totalExpenses: String(report.totalExpenses),
        balance: String(report.balance),
        savingsRate: report.savingsRate,
        transactionCount: report.transactionCount,
        byCategory: JSON.stringify(report.byCategory),
      })
      .returning();

    res.status(201).json({
      month: saved.month,
      closed: true,
      closedAt: saved.closedAt.toISOString(),
      totalIncome: parseFloat(String(saved.totalIncome)),
      totalExpenses: parseFloat(String(saved.totalExpenses)),
      balance: parseFloat(String(saved.balance)),
      savingsRate: saved.savingsRate,
      transactionCount: saved.transactionCount,
      byCategory: JSON.parse(saved.byCategory) as ByCategoryEntry[],
    });
  },
);

export default router;
