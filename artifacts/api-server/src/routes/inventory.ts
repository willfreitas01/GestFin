import { Router } from "express";
import { db, inventoryTable, inventoryMovementsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// Listar produtos do estoque
router.get("/inventory", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const rows = await db
    .select()
    .from(inventoryTable)
    .where(eq(inventoryTable.userId, userId))
    .orderBy(inventoryTable.name);
  res.json(
    rows.map((p) => ({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      minQuantity: p.minQuantity,
      costPrice: parseFloat(String(p.costPrice)),
      salePrice: parseFloat(String(p.salePrice)),
      lowStock: p.quantity < p.minQuantity,
      createdAt: p.createdAt.toISOString(),
    })),
  );
});

// Criar produto
router.post("/inventory", requireAuth, async (req, res): Promise<void> => {
  const { name, quantity, minQuantity, costPrice, salePrice } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Nome é obrigatório." });
    return;
  }
  const userId = req.session.userId!;
  const [row] = await db
    .insert(inventoryTable)
    .values({
      userId,
      name: name.trim(),
      quantity: parseInt(quantity) || 0,
      minQuantity: parseInt(minQuantity) || 0,
      costPrice: String(parseFloat(costPrice) || 0),
      salePrice: String(parseFloat(salePrice) || 0),
    })
    .returning();
  res.status(201).json({
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    minQuantity: row.minQuantity,
    costPrice: parseFloat(String(row.costPrice)),
    salePrice: parseFloat(String(row.salePrice)),
    lowStock: row.quantity < row.minQuantity,
    createdAt: row.createdAt.toISOString(),
  });
});

// Editar produto
router.put("/inventory/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }
  const { name, minQuantity, costPrice, salePrice } = req.body;
  const data: Record<string, unknown> = {};
  if (name) data.name = name.trim();
  if (minQuantity !== undefined) data.minQuantity = parseInt(minQuantity) || 0;
  if (costPrice !== undefined)
    data.costPrice = String(parseFloat(costPrice) || 0);
  if (salePrice !== undefined)
    data.salePrice = String(parseFloat(salePrice) || 0);

  const userId = req.session.userId!;
  const updated = await db
    .update(inventoryTable)
    .set(data)
    .where(and(eq(inventoryTable.id, id), eq(inventoryTable.userId, userId)))
    .returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Produto não encontrado." });
    return;
  }
  const row = updated[0];
  res.json({
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    minQuantity: row.minQuantity,
    costPrice: parseFloat(String(row.costPrice)),
    salePrice: parseFloat(String(row.salePrice)),
    lowStock: row.quantity < row.minQuantity,
    createdAt: row.createdAt.toISOString(),
  });
});

// Apagar produto
router.delete(
  "/inventory/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido." });
      return;
    }
    const userId = req.session.userId!;
    const deleted = await db
      .delete(inventoryTable)
      .where(and(eq(inventoryTable.id, id), eq(inventoryTable.userId, userId)))
      .returning({ id: inventoryTable.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Produto não encontrado." });
      return;
    }
    res.json({ message: "Produto excluído com sucesso." });
  },
);

// Registrar movimentação (entrada ou saída)
router.post(
  "/inventory/:id/movement",
  requireAuth,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido." });
      return;
    }
    const { type, quantity, note } = req.body;
    if (type !== "in" && type !== "out") {
      res.status(400).json({ error: "Tipo deve ser 'in' ou 'out'." });
      return;
    }
    const qty = parseInt(quantity);
    if (!qty || qty < 1) {
      res.status(400).json({ error: "Quantidade deve ser maior que zero." });
      return;
    }
    const userId = req.session.userId!;
    const [product] = await db
      .select()
      .from(inventoryTable)
      .where(and(eq(inventoryTable.id, id), eq(inventoryTable.userId, userId)))
      .limit(1);
    if (!product) {
      res.status(404).json({ error: "Produto não encontrado." });
      return;
    }
    if (type === "out" && product.quantity < qty) {
      res.status(400).json({ error: "Quantidade insuficiente em estoque." });
      return;
    }
    const newQuantity =
      type === "in" ? product.quantity + qty : product.quantity - qty;
    const [updated] = await db
      .update(inventoryTable)
      .set({ quantity: newQuantity })
      .where(eq(inventoryTable.id, id))
      .returning();
    await db.insert(inventoryMovementsTable).values({
      inventoryId: id,
      userId,
      type,
      quantity: qty,
      note: note ?? null,
    });
    res.json({
      id: updated.id,
      name: updated.name,
      quantity: updated.quantity,
      minQuantity: updated.minQuantity,
      costPrice: parseFloat(String(updated.costPrice)),
      salePrice: parseFloat(String(updated.salePrice)),
      lowStock: updated.quantity < updated.minQuantity,
    });
  },
);

// Listar movimentações de um produto
router.get(
  "/inventory/:id/movements",
  requireAuth,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido." });
      return;
    }
    const userId = req.session.userId!;
    const rows = await db
      .select()
      .from(inventoryMovementsTable)
      .where(
        and(
          eq(inventoryMovementsTable.inventoryId, id),
          eq(inventoryMovementsTable.userId, userId),
        ),
      )
      .orderBy(desc(inventoryMovementsTable.createdAt));
    res.json(
      rows.map((m) => ({
        id: m.id,
        type: m.type,
        quantity: m.quantity,
        note: m.note,
        createdAt: m.createdAt.toISOString(),
      })),
    );
  },
);

export default router;
