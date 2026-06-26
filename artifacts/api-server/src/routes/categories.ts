import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// Listar categorias do usuário
router.get("/categories", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const rows = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId))
    .orderBy(categoriesTable.name);
  res.json(
    rows.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      color: c.color,
      createdAt: c.createdAt.toISOString(),
    })),
  );
});

// Criar categoria
router.post("/categories", requireAuth, async (req, res): Promise<void> => {
  const { name, type, color } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Nome é obrigatório." });
    return;
  }
  if (type !== "income" && type !== "expense") {
    res.status(400).json({ error: "Tipo deve ser 'income' ou 'expense'." });
    return;
  }
  const userId = req.session.userId!;
  const [row] = await db
    .insert(categoriesTable)
    .values({ userId, name: name.trim(), type, color: color || "#1a5c2a" })
    .returning();
  res.status(201).json({
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    createdAt: row.createdAt.toISOString(),
  });
});

// Editar categoria
router.put("/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }
  const { name, type, color } = req.body;
  if (type && type !== "income" && type !== "expense") {
    res.status(400).json({ error: "Tipo deve ser 'income' ou 'expense'." });
    return;
  }
  const data: Record<string, string> = {};
  if (name) data.name = name.trim();
  if (type) data.type = type;
  if (color) data.color = color;

  const userId = req.session.userId!;
  const updated = await db
    .update(categoriesTable)
    .set(data)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
    .returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Categoria não encontrada." });
    return;
  }
  const row = updated[0];
  res.json({
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    createdAt: row.createdAt.toISOString(),
  });
});

// Apagar categoria
router.delete(
  "/categories/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido." });
      return;
    }
    const userId = req.session.userId!;
    const deleted = await db
      .delete(categoriesTable)
      .where(
        and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)),
      )
      .returning({ id: categoriesTable.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Categoria não encontrada." });
      return;
    }
    res.json({ message: "Categoria excluída com sucesso." });
  },
);

export default router;
