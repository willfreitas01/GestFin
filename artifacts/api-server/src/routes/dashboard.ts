import { Router } from "express";
import { db, transactionsTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const INCOME_CATEGORIES = ["venda"];
const EXPENSE_CATEGORIES = ["material", "funcionarios", "outro"];

const CAT_LABELS: Record<string, string> = {
  venda: "Receita Operacional",
  material: "Insumos",
  funcionarios: "Folha de Pagamento",
  outro: "Outras Despesas",
};

function currentMonth(): { startDate: string; endDate: string; month: string } {
  const now = new Date();
  const year = now.getFullYear();
  const mon = String(now.getMonth() + 1).padStart(2, "0");
  return {
    month: `${year}-${mon}`,
    startDate: `${year}-${mon}-01`,
    endDate: `${year}-${mon}-31`,
  };
}

function last7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const { startDate, endDate, month } = currentMonth();

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, userId),
        gte(transactionsTable.date, startDate),
        lte(transactionsTable.date, endDate),
      ),
    );

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const row of rows) {
    const amount = parseFloat(String(row.amount));
    if (INCOME_CATEGORIES.includes(row.category)) {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
    }
  }

  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

  res.json({
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    transactionCount: rows.length,
    month,
  });
});

router.get("/dashboard/weekly", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const days = last7Days();

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, userId),
        gte(transactionsTable.date, days[0]),
        lte(transactionsTable.date, days[days.length - 1]),
      ),
    );

  const byDate: Record<string, { income: number; expenses: number }> = {};
  for (const day of days) {
    byDate[day] = { income: 0, expenses: 0 };
  }

  for (const row of rows) {
    const d = row.date;
    if (byDate[d]) {
      const amount = parseFloat(String(row.amount));
      if (INCOME_CATEGORIES.includes(row.category)) {
        byDate[d].income += amount;
      } else {
        byDate[d].expenses += amount;
      }
    }
  }

  const result = days.map((date) => ({
    date,
    income: byDate[date].income,
    expenses: byDate[date].expenses,
  }));

  res.json(result);
});

router.get("/dashboard/by-category", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const { startDate, endDate } = currentMonth();

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, userId),
        gte(transactionsTable.date, startDate),
        lte(transactionsTable.date, endDate),
      ),
    );

  const byCategory: Record<string, number> = {};
  let grandTotal = 0;

  for (const row of rows) {
    const amount = parseFloat(String(row.amount));
    byCategory[row.category] = (byCategory[row.category] ?? 0) + amount;
    grandTotal += amount;
  }

  const result = Object.entries(byCategory).map(([category, total]) => ({
    category,
    label: CAT_LABELS[category] ?? category,
    total,
    percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
  }));

  res.json(result);
});

router.get("/dashboard/recent", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt))
    .limit(10);

  res.json(
    rows.map((t) => ({
      id: t.id,
      date: t.date,
      category: t.category,
      description: t.description,
      amount: parseFloat(String(t.amount)),
      createdAt: t.createdAt.toISOString(),
    })),
  );
});

export default router;
