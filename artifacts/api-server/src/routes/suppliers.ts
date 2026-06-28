import { Router } from "express";
import { db, suppliersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/suppliers", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const rows = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.userId, userId))
    .orderBy(suppliersTable.name);
  res.json(
    rows.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      email: s.email,
      cnpj: s.cnpj,
      category: s.category,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
    })),
  );
});

router.post("/suppliers", requireAuth, async (req, res): Promise<void> => {
  const { name, phone, email, cnpj, category, notes } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "Nome é obrigatório." });
    return;
  }
  const userId = req.session.userId!;
  const [row] = await db
    .insert(suppliersTable)
    .values({ userId, name: name.trim(), phone, email, cnpj, category, notes })
    .returning();
  res.status(201).json({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    cnpj: row.cnpj,
    category: row.category,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  });
});

router.put("/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }
  const userId = req.session.userId!;
  const { name, phone, email, cnpj, category, notes } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim();
  if (phone !== undefined) data.phone = phone;
  if (email !== undefined) data.email = email;
  if (cnpj !== undefined) data.cnpj = cnpj;
  if (category !== undefined) data.category = category;
  if (notes !== undefined) data.notes = notes;
  const updated = await db
    .update(suppliersTable)
    .set(data)
    .where(and(eq(suppliersTable.id, id), eq(suppliersTable.userId, userId)))
    .returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Fornecedor não encontrado." });
    return;
  }
  const row = updated[0];
  res.json({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    cnpj: row.cnpj,
    category: row.category,
    notes: row.notes,
  });
});

router.delete(
  "/suppliers/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido." });
      return;
    }
    const userId = req.session.userId!;
    const deleted = await db
      .delete(suppliersTable)
      .where(and(eq(suppliersTable.id, id), eq(suppliersTable.userId, userId)))
      .returning({ id: suppliersTable.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Fornecedor não encontrado." });
      return;
    }
    res.json({ message: "Fornecedor excluído com sucesso." });
  },
);

export default router;
