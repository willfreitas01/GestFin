import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// Listar pedidos de um cliente
router.get(
  "/clients/:clientId/orders",
  requireAuth,
  async (req, res): Promise<void> => {
    const clientId = parseInt(req.params.clientId);
    const userId = req.session.userId!;
    const rows = await db.execute(sql`
    SELECT o.* FROM orders o
    JOIN clients c ON c.id = o.client_id
    WHERE o.client_id = ${clientId} AND c.user_id = ${userId}
    ORDER BY o.created_at DESC
  `);
    res.json(
      rows.rows.map((r: any) => ({
        id: r.id,
        clientId: r.client_id,
        description: r.description,
        status: r.status,
        notes: r.notes,
        price: r.price ? parseFloat(r.price) : null,
        dueDate: r.due_date ?? null,
        createdAt: r.created_at,
      })),
    );
  },
);

// Criar pedido
router.post(
  "/clients/:clientId/orders",
  requireAuth,
  async (req, res): Promise<void> => {
    const clientId = parseInt(req.params.clientId);
    const userId = req.session.userId!;
    const { description, notes, price, dueDate } = req.body;
    if (!description?.trim()) {
      res.status(400).json({ error: "Descrição obrigatória." });
      return;
    }
    const rows = await db.execute(sql`
    INSERT INTO orders (user_id, client_id, description, notes, status, price, due_date)
    VALUES (${userId}, ${clientId}, ${description.trim()}, ${notes ?? null}, 'pending',
            ${price ? parseFloat(price) : null}, ${dueDate ?? null})
    RETURNING *
  `);
    const r = rows.rows[0] as any;
    res.status(201).json({
      id: r.id,
      clientId: r.client_id,
      description: r.description,
      status: r.status,
      notes: r.notes,
      price: r.price ? parseFloat(r.price) : null,
      dueDate: r.due_date ?? null,
      createdAt: r.created_at,
    });
  },
);

// Atualizar pedido
router.put("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const userId = req.session.userId!;
  const { status, price, dueDate, notes } = req.body;
  const valid = ["pending", "in_progress", "done", "delivered"];
  if (status && !valid.includes(status)) {
    res.status(400).json({ error: "Status inválido." });
    return;
  }

  const rows = await db.execute(sql`
    UPDATE orders SET
      status = COALESCE(${status ?? null}, status),
      price = COALESCE(${price != null ? parseFloat(price) : null}, price),
      due_date = COALESCE(${dueDate ?? null}, due_date),
      notes = COALESCE(${notes ?? null}, notes),
      updated_at = now()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `);
  if (rows.rows.length === 0) {
    res.status(404).json({ error: "Pedido não encontrado." });
    return;
  }
  const r = rows.rows[0] as any;
  res.json({
    id: r.id,
    clientId: r.client_id,
    description: r.description,
    status: r.status,
    notes: r.notes,
    price: r.price ? parseFloat(r.price) : null,
    dueDate: r.due_date ?? null,
    createdAt: r.created_at,
  });
});

// Deletar pedido
router.delete("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const userId = req.session.userId!;
  const rows = await db.execute(
    sql`DELETE FROM orders WHERE id = ${id} AND user_id = ${userId} RETURNING id`,
  );
  if (rows.rows.length === 0) {
    res.status(404).json({ error: "Pedido não encontrado." });
    return;
  }
  res.json({ message: "Pedido removido." });
});

export default router;
