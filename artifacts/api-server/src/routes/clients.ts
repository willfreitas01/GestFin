import { Router } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/clients", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const rows = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.userId, userId))
    .orderBy(clientsTable.name);
  res.json(
    rows.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
    })),
  );
});

router.post("/clients", requireAuth, async (req, res): Promise<void> => {
  const { name, phone, email, address, notes } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "Nome é obrigatório." });
    return;
  }
  const userId = req.session.userId!;
  const [row] = await db
    .insert(clientsTable)
    .values({ userId, name: name.trim(), phone, email, address, notes })
    .returning();
  res.status(201).json({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  });
});

router.put("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }
  const userId = req.session.userId!;
  const { name, phone, email, address, notes } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim();
  if (phone !== undefined) data.phone = phone;
  if (email !== undefined) data.email = email;
  if (address !== undefined) data.address = address;
  if (notes !== undefined) data.notes = notes;
  const updated = await db
    .update(clientsTable)
    .set(data)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, userId)))
    .returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Cliente não encontrado." });
    return;
  }
  const row = updated[0];
  res.json({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
  });
});

router.delete("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }
  const userId = req.session.userId!;
  const deleted = await db
    .delete(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, userId)))
    .returning({ id: clientsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Cliente não encontrado." });
    return;
  }
  res.json({ message: "Cliente excluído com sucesso." });
});

export default router;
