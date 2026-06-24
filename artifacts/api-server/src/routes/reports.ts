import { Router } from "express";
import { db, transactionsTable } from "@workspace/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { GetMonthlyReportQueryParams } from "@workspace/api-zod";

const router = Router();

const INCOME_CATEGORIES = ["venda"];

const CAT_LABELS: Record<string, string> = {
  venda: "Receita Operacional",
  material: "Insumos",
  funcionarios: "Folha de Pagamento",
  outro: "Outras Despesas",
};

router.get("/reports/monthly", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetMonthlyReportQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parâmetros inválidos. Use month=YYYY-MM." });
    return;
  }

  const userId = req.session.userId!;
  const { month } = parsed.data;
  const [year, mon] = month.split("-");
  const startDate = `${year}-${mon}-01`;
  const endDate = `${year}-${mon}-31`;

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
    if (INCOME_CATEGORIES.includes(t.category)) {
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

  const byCategoryArr = Object.entries(byCategory).map(([category, total]) => ({
    category,
    label: CAT_LABELS[category] ?? category,
    total,
    percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
  }));

  res.json({
    month,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    byCategory: byCategoryArr,
    transactions,
  });
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

  const months = rows.map((r) => r.month);
  res.json(months);
});

export default router;
