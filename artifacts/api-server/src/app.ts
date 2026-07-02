import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import { fileURLToPath } from "url";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env.SESSION_SECRET ?? "fincontrol-dev-secret";
const PgSessionStore = pgSession(session);

async function ensureSessionTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
    );
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");`,
  );
}

async function ensureMonthlyReportsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "monthly_reports" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "month" text NOT NULL,
      "total_income" numeric(12,2) NOT NULL,
      "total_expenses" numeric(12,2) NOT NULL,
      "balance" numeric(12,2) NOT NULL,
      "savings_rate" integer NOT NULL,
      "transaction_count" integer NOT NULL,
      "by_category" text NOT NULL,
      "closed_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "monthly_reports_user_month_unique" UNIQUE ("user_id", "month")
    );
  `);
}

async function ensureCategoriesTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "categories" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "name" text NOT NULL,
      "type" text NOT NULL,
      "color" text NOT NULL DEFAULT '#1a5c2a',
      "created_at" timestamp NOT NULL DEFAULT now()
    );
  `);
}

async function ensureInventoryTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "inventory" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "name" text NOT NULL,
      "quantity" integer NOT NULL DEFAULT 0,
      "min_quantity" integer NOT NULL DEFAULT 0,
      "cost_price" numeric(12,2) NOT NULL DEFAULT 0,
      "sale_price" numeric(12,2) NOT NULL DEFAULT 0,
      "created_at" timestamp NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "inventory_movements" (
      "id" serial PRIMARY KEY,
      "inventory_id" integer NOT NULL REFERENCES "inventory"("id") ON DELETE CASCADE,
      "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "type" text NOT NULL,
      "quantity" integer NOT NULL,
      "note" text,
      "created_at" timestamp NOT NULL DEFAULT now()
    );
  `);
}

async function ensureEmployeesTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "employees" (
      "id" serial PRIMARY KEY,
      "owner_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "name" text NOT NULL,
      "email" text NOT NULL,
      "password_hash" text NOT NULL,
      "active" boolean NOT NULL DEFAULT true,
      "can_sell_inventory" boolean NOT NULL DEFAULT true,
      "can_register_sale" boolean NOT NULL DEFAULT false,
      "can_view_reports" boolean NOT NULL DEFAULT false,
      "can_view_history" boolean NOT NULL DEFAULT false,
      "created_at" timestamp NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "idx_employees_owner_id" ON "employees" ("owner_id");`,
  );
}

async function ensureClientsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "clients" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "name" text NOT NULL,
      "phone" text,
      "email" text,
      "address" text,
      "notes" text,
      "created_at" timestamp NOT NULL DEFAULT now()
    );
  `);
}

async function ensureSuppliersTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "suppliers" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "name" text NOT NULL,
      "phone" text,
      "email" text,
      "cnpj" text,
      "category" text,
      "notes" text,
      "created_at" timestamp NOT NULL DEFAULT now()
    );
  `);
}

async function fixTransactionTypes(): Promise<void> {
  await pool.query(
    `UPDATE "transactions" SET "type" = 'income' WHERE "category" IN ('venda', 'Receita Operacional') AND "type" != 'income';`,
  );
  await pool.query(
    `UPDATE "transactions" SET "type" = 'expense' WHERE "category" IN ('material', 'funcionarios', 'outro', 'Insumos', 'Folha de Pagamento', 'Outras Despesas') AND "type" != 'expense';`,
  );
  await pool.query(
    `UPDATE "transactions" SET "type" = 'income' WHERE "description" LIKE 'Venda de estoque%' AND "type" != 'income';`,
  );
  await pool.query(
    `UPDATE "transactions" SET "type" = 'expense' WHERE "description" LIKE 'Entrada de estoque%' AND "type" != 'expense';`,
  );
}

await ensureSessionTable();
await ensureMonthlyReportsTable();
await ensureCategoriesTable();
await ensureInventoryTables();
await ensureEmployeesTable();
await ensureClientsTable();
await ensureSuppliersTable();
await fixTransactionTypes();

app.use(
  session({
    store: new PgSessionStore({
      pool,
      tableName: "session",
      createTableIfMissing: false,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use("/api", router);

// Serve frontend estático em produção
if (process.env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendDist = path.resolve(
    __dirname,
    "../../fincontrol/dist",
  );
  app.use(express.static(frontendDist));
  app.get("/*splat", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
