import { Router } from "express";
import { db, transactionsTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import {
  ListTransactionsQueryParams,
  CreateTransactionBody,
  DeleteTransactionParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/transactions", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListTransactionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parâmetros inválidos." });
    return;
  }

  const userId = req.session.userId!;
  const { category, month, limit = 100 } = parsed.data;

  const conditions = [eq(transactionsTable.userId, userId)];

  if (category) {
    conditions.push(eq(transactionsTable.category, category));
  }

  if (month) {
    const [year, mon] = month.split("-");
    const startDate = `${year}-${mon}-01`;
    const endDate = `${year}-${mon}-31`;
    conditions.push(gte(transactionsTable.date, startDate));
    conditions.push(lte(transactionsTable.date, endDate));
  }

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(and(...conditions))
    .orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt))
    .limit(limit);

  const result = rows.map((t) => ({
    id: t.id,
    date: t.date,
    category: t.category,
    description: t.description,
    amount: parseFloat(String(t.amount)),
    createdAt: t.createdAt.toISOString(),
  }));

  res.json(result);
});

router.post("/transactions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos." });
    return;
  }

  const userId = req.session.userId!;
  const { date, category, description, amount } = parsed.data;

  const [row] = await db.insert(transactionsTable).values({
    userId,
    date,
    category,
    description,
    amount: String(amount),
  }).returning();

  res.status(201).json({
    id: row.id,
    date: row.date,
    category: row.category,
    description: row.description,
    amount: parseFloat(String(row.amount)),
    createdAt: row.createdAt.toISOString(),
  });
});

router.delete("/transactions/:id", requireAuth, async (req, res): Promise<void> => {
  const parsed = DeleteTransactionParams.safeParse({ id: parseInt(req.params.id as string) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }

  const userId = req.session.userId!;
  const deleted = await db
    .delete(transactionsTable)
    .where(and(eq(transactionsTable.id, parsed.data.id), eq(transactionsTable.userId, userId)))
    .returning({ id: transactionsTable.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: "Lançamento não encontrado." });
    return;
  }

  res.json({ message: "Lançamento excluído com sucesso." });
});

export default router;
