import { Router } from "express";
import {
  db,
  employeesTable,
  inventoryTable,
  inventoryMovementsTable,
  transactionsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { createHash } from "crypto";

const router = Router();

function hashStr(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function requireEmployee(req: any, res: any, next: any): void {
  if (!req.session.employeeId || !req.session.ownerId) {
    res.status(401).json({ error: "Funcionário não autenticado." });
    return;
  }
  next();
}

// Listar funcionários
router.get("/employees", requireAuth, async (req, res): Promise<void> => {
  const ownerId = req.session.userId!;
  const rows = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.ownerId, ownerId))
    .orderBy(employeesTable.name);

  res.json(
    rows.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      active: e.active,
      canSellInventory: e.canSellInventory,
      canRegisterSale: e.canRegisterSale,
      canViewReports: e.canViewReports,
      canViewHistory: e.canViewHistory,
      createdAt: e.createdAt.toISOString(),
    })),
  );
});

// Criar funcionário
router.post("/employees", requireAuth, async (req, res): Promise<void> => {
  const {
    name,
    email,
    password,
    canSellInventory,
    canRegisterSale,
    canViewReports,
    canViewHistory,
  } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
    return;
  }

  const ownerId = req.session.userId!;

  const existing = await db
    .select()
    .from(employeesTable)
    .where(
      and(
        eq(employeesTable.ownerId, ownerId),
        eq(employeesTable.email, email.toLowerCase()),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    res
      .status(409)
      .json({ error: "Já existe um funcionário com este e-mail." });
    return;
  }

  const [emp] = await db
    .insert(employeesTable)
    .values({
      ownerId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashStr(email.toLowerCase().trim() + password),
      active: true,
      canSellInventory: canSellInventory ?? true,
      canRegisterSale: canRegisterSale ?? false,
      canViewReports: canViewReports ?? false,
      canViewHistory: canViewHistory ?? false,
    })
    .returning();

  res.status(201).json({
    id: emp.id,
    name: emp.name,
    email: emp.email,
    active: emp.active,
    canSellInventory: emp.canSellInventory,
    canRegisterSale: emp.canRegisterSale,
    canViewReports: emp.canViewReports,
    canViewHistory: emp.canViewHistory,
    createdAt: emp.createdAt.toISOString(),
  });
});

// Editar funcionário
router.put("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }

  const ownerId = req.session.userId!;
  const {
    name,
    email,
    password,
    active,
    canSellInventory,
    canRegisterSale,
    canViewReports,
    canViewHistory,
  } = req.body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim();
  if (email !== undefined) data.email = email.toLowerCase().trim();
  if (password !== undefined && email !== undefined) {
    data.passwordHash = hashStr(email.toLowerCase().trim() + password);
  }
  if (active !== undefined) data.active = active;
  if (canSellInventory !== undefined) data.canSellInventory = canSellInventory;
  if (canRegisterSale !== undefined) data.canRegisterSale = canRegisterSale;
  if (canViewReports !== undefined) data.canViewReports = canViewReports;
  if (canViewHistory !== undefined) data.canViewHistory = canViewHistory;

  const updated = await db
    .update(employeesTable)
    .set(data)
    .where(and(eq(employeesTable.id, id), eq(employeesTable.ownerId, ownerId)))
    .returning();

  if (updated.length === 0) {
    res.status(404).json({ error: "Funcionário não encontrado." });
    return;
  }

  const e = updated[0];
  res.json({
    id: e.id,
    name: e.name,
    email: e.email,
    active: e.active,
    canSellInventory: e.canSellInventory,
    canRegisterSale: e.canRegisterSale,
    canViewReports: e.canViewReports,
    canViewHistory: e.canViewHistory,
  });
});

// Remover funcionário
router.delete(
  "/employees/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido." });
      return;
    }

    const ownerId = req.session.userId!;
    const deleted = await db
      .delete(employeesTable)
      .where(
        and(eq(employeesTable.id, id), eq(employeesTable.ownerId, ownerId)),
      )
      .returning({ id: employeesTable.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: "Funcionário não encontrado." });
      return;
    }
    res.json({ message: "Funcionário removido com sucesso." });
  },
);

// Login do funcionário
router.post("/employee/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    return;
  }

  const [emp] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (!emp) {
    res.status(401).json({ error: "Funcionário não encontrado." });
    return;
  }
  if (!emp.active) {
    res
      .status(403)
      .json({ error: "Acesso desativado. Contate o proprietário." });
    return;
  }
  if (emp.passwordHash !== hashStr(email.toLowerCase().trim() + password)) {
    res.status(401).json({ error: "Senha incorreta." });
    return;
  }

  req.session.employeeId = emp.id;
  req.session.ownerId = emp.ownerId;
  req.session.employeeName = emp.name;
  delete req.session.userId;
  delete req.session.username;

  res.json({
    id: emp.id,
    name: emp.name,
    ownerId: emp.ownerId,
    canSellInventory: emp.canSellInventory,
    canRegisterSale: emp.canRegisterSale,
    canViewReports: emp.canViewReports,
    canViewHistory: emp.canViewHistory,
  });
});

// Logout do funcionário
router.post("/employee/logout", (req, res): void => {
  req.session.destroy(() => res.json({ message: "Sessão encerrada." }));
});

// Dados do funcionário logado
router.get("/employee/me", requireEmployee, async (req, res): Promise<void> => {
  const [emp] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.id, req.session.employeeId!))
    .limit(1);

  if (!emp || !emp.active) {
    res.status(403).json({ error: "Acesso desativado." });
    return;
  }

  res.json({
    id: emp.id,
    name: emp.name,
    ownerId: emp.ownerId,
    canSellInventory: emp.canSellInventory,
    canRegisterSale: emp.canRegisterSale,
    canViewReports: emp.canViewReports,
    canViewHistory: emp.canViewHistory,
  });
});

// Listar estoque (funcionário)
router.get(
  "/employee/inventory",
  requireEmployee,
  async (req, res): Promise<void> => {
    const ownerId = req.session.ownerId!;
    const [emp] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.id, req.session.employeeId!))
      .limit(1);
    if (!emp || !emp.active || !emp.canSellInventory) {
      res.status(403).json({ error: "Sem permissão para acessar o estoque." });
      return;
    }

    const rows = await db
      .select()
      .from(inventoryTable)
      .where(eq(inventoryTable.userId, ownerId))
      .orderBy(inventoryTable.name);

    res.json(
      rows.map((p) => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
        salePrice: parseFloat(String(p.salePrice)),
      })),
    );
  },
);

// Dar baixa no estoque (funcionário)
router.post(
  "/employee/inventory/:id/sell",
  requireEmployee,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido." });
      return;
    }

    const ownerId = req.session.ownerId!;
    const [emp] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.id, req.session.employeeId!))
      .limit(1);
    if (!emp || !emp.active || !emp.canSellInventory) {
      res
        .status(403)
        .json({ error: "Sem permissão para dar baixa no estoque." });
      return;
    }

    const { quantity, note } = req.body;
    const qty = parseInt(quantity);
    if (!qty || qty < 1) {
      res.status(400).json({ error: "Quantidade deve ser maior que zero." });
      return;
    }

    const [product] = await db
      .select()
      .from(inventoryTable)
      .where(and(eq(inventoryTable.id, id), eq(inventoryTable.userId, ownerId)))
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Produto não encontrado." });
      return;
    }
    if (product.quantity < qty) {
      res.status(400).json({ error: "Quantidade insuficiente em estoque." });
      return;
    }

    const [updated] = await db
      .update(inventoryTable)
      .set({ quantity: product.quantity - qty })
      .where(eq(inventoryTable.id, id))
      .returning();

    await db.insert(inventoryMovementsTable).values({
      inventoryId: id,
      userId: ownerId,
      type: "out",
      quantity: qty,
      note: note ? `[Func: ${emp.name}] ${note}` : `[Func: ${emp.name}] Venda`,
    });

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const amount = parseFloat(String(product.salePrice)) * qty;

    if (amount > 0) {
      await db.insert(transactionsTable).values({
        userId: ownerId,
        date: dateStr,
        category: "Receita Operacional",
        type: "income",
        description: `Venda de estoque: ${product.name} (${qty} un) — por ${emp.name}${note ? ` — ${note}` : ""}`,
        amount: String(amount),
      });
    }

    res.json({
      message: "Baixa registrada com sucesso.",
      product: {
        id: updated.id,
        name: updated.name,
        quantity: updated.quantity,
        salePrice: parseFloat(String(updated.salePrice)),
      },
      amountRegistered: amount,
    });
  },
);

// Registrar venda avulsa (funcionário)
router.post(
  "/employee/sale",
  requireEmployee,
  async (req, res): Promise<void> => {
    const ownerId = req.session.ownerId!;
    const [emp] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.id, req.session.employeeId!))
      .limit(1);
    if (!emp || !emp.active || !emp.canRegisterSale) {
      res.status(403).json({ error: "Sem permissão para registrar vendas." });
      return;
    }

    const { description, amount, date } = req.body;
    if (!description || !amount) {
      res.status(400).json({ error: "Descrição e valor são obrigatórios." });
      return;
    }

    const today = new Date();
    const dateStr =
      date ??
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const [row] = await db
      .insert(transactionsTable)
      .values({
        userId: ownerId,
        date: dateStr,
        category: "venda",
        type: "income",
        description: `${description} — por ${emp.name}`,
        amount: String(parseFloat(amount)),
      })
      .returning();

    res.status(201).json({
      message: "Venda registrada com sucesso.",
      transaction: {
        id: row.id,
        date: row.date,
        description: row.description,
        amount: parseFloat(String(row.amount)),
        createdAt: row.createdAt.toISOString(),
      },
    });
  },
);

export default router;
