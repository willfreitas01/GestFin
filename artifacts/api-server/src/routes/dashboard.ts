import { Router } from "express";
import { db, transactionsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonth(): { startDate: string; endDate: string; month: string } {
  const now = new Date();
  const year = now.getFullYear();
  const monNum = now.getMonth() + 1;
  const mon = String(monNum).padStart(2, "0");
  return {
    month: `${year}-${mon}`,
    startDate: `${year}-${mon}-01`,
    endDate: lastDayOfMonth(year, monNum),
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

// Busca mapa de categorias do usuário: nome -> tipo (income/expense)
async function getCategoryTypeMap(
  userId: number,
): Promise<Record<string, string>> {
  const cats = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId));
  const map: Record<string, string> = {};
  for (const c of cats) {
    map[c.name] = c.type;
  }
  return map;
}

function isIncome(category: string, typeMap: Record<string, string>): boolean {
  // Verifica pelo mapa de categorias do usuário
  if (typeMap[category]) return typeMap[category] === "income";
  // Fallback para categorias antigas fixas
  return category === "venda";
}

router.get(
  "/dashboard/summary",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const { startDate, endDate, month } = currentMonth();
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
      );

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const row of rows) {
      const amount = parseFloat(String(row.amount));
      if (isIncome(row.category, typeMap)) {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
      }
    }

    const balance = totalIncome - totalExpenses;
    const savingsRate =
      totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

    res.json({
      totalIncome,
      totalExpenses,
      balance,
      savingsRate,
      transactionCount: rows.length,
      month,
    });
  },
);

router.get(
  "/dashboard/weekly",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const days = last7Days();
    const typeMap = await getCategoryTypeMap(userId);

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
    for (const day of days) byDate[day] = { income: 0, expenses: 0 };

    for (const row of rows) {
      const d = row.date;
      if (byDate[d]) {
        const amount = parseFloat(String(row.amount));
        if (isIncome(row.category, typeMap)) {
          byDate[d].income += amount;
        } else {
          byDate[d].expenses += amount;
        }
      }
    }

    res.json(
      days.map((date) => ({
        date,
        income: byDate[date].income,
        expenses: byDate[date].expenses,
      })),
    );
  },
);

router.get(
  "/dashboard/by-category",
  requireAuth,
  async (req, res): Promise<void> => {
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
      label: category,
      total,
      percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
    }));

    res.json(result);
  },
);

router.get(
  "/dashboard/recent",
  requireAuth,
  async (req, res): Promise<void> => {
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
  },
);

export default router;
