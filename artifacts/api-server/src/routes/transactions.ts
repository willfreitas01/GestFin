import { Router } from "express";
import { db, transactionsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Busca o tipo da categoria pelo nome
async function getCategoryType(
  userId: number,
  categoryName: string,
): Promise<string> {
  const [cat] = await db
    .select()
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.userId, userId),
        eq(categoriesTable.name, categoryName),
      ),
    )
    .limit(1);
  if (cat) return cat.type;
  // Fallback para categorias antigas
  if (categoryName === "venda") return "income";
  return "expense";
}

router.get("/transactions", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const {
    category,
    month,
    limit = 100,
  } = req.query as { category?: string; month?: string; limit?: number };

  const conditions = [eq(transactionsTable.userId, userId)];
  if (category) conditions.push(eq(transactionsTable.category, category));
  if (month) {
    const [year, mon] = String(month).split("-");
    conditions.push(gte(transactionsTable.date, `${year}-${mon}-01`));
    conditions.push(
      lte(
        transactionsTable.date,
        lastDayOfMonth(parseInt(year), parseInt(mon)),
      ),
    );
  }

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(and(...conditions))
    .orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt))
    .limit(Number(limit) || 100);

  res.json(
    rows.map((t) => ({
      id: t.id,
      date: t.date,
      category: t.category,
      type: t.type,
      description: t.description,
      amount: parseFloat(String(t.amount)),
      createdAt: t.createdAt.toISOString(),
    })),
  );
});

router.post("/transactions", requireAuth, async (req, res): Promise<void> => {
  const { date, category, description, amount } = req.body;
  if (!date || !category || !description || !amount) {
    res.status(400).json({ error: "Dados inválidos." });
    return;
  }
  const userId = req.session.userId!;
  const type = await getCategoryType(userId, category);

  const [row] = await db
    .insert(transactionsTable)
    .values({
      userId,
      date,
      category,
      type,
      description,
      amount: String(amount),
    })
    .returning();

  res.status(201).json({
    id: row.id,
    date: row.date,
    category: row.category,
    type: row.type,
    description: row.description,
    amount: parseFloat(String(row.amount)),
    createdAt: row.createdAt.toISOString(),
  });
});

router.delete(
  "/transactions/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido." });
      return;
    }
    const userId = req.session.userId!;
    const deleted = await db
      .delete(transactionsTable)
      .where(
        and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)),
      )
      .returning({ id: transactionsTable.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Lançamento não encontrado." });
      return;
    }
    res.json({ message: "Lançamento excluído com sucesso." });
  },
);

export default router;
