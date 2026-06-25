import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
const app: Express = express();

// Necessário para que o Express reconheça corretamente que a conexão chegou
// via HTTPS quando está atrás do proxy/load balancer do Replit. Sem isso,
// cookies com "secure: true" não funcionam corretamente em produção e a
// sessão não persiste entre requisições (login funciona, mas /auth/me
// sempre retorna 401).
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const sessionSecret = process.env.SESSION_SECRET ?? "fincontrol-dev-secret";
const PgSessionStore = pgSession(session);

// connect-pg-simple's createTableIfMissing reads an external table.sql file
// that doesn't get copied into dist/ by esbuild's bundling, so we create the
// table ourselves on startup instead. Safe to run on every boot (idempotent).
// We await this before registering the session middleware so no request can
// reach it before the table exists.
async function ensureSessionTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `);
}

// Tabela de relatórios mensais "fechados" (snapshot congelado). Criada aqui
// pelo mesmo motivo da tabela de sessão: o drizzle-kit push não roda
// automaticamente no deploy, então garantimos a existência da tabela no boot.
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

await ensureSessionTable();
await ensureMonthlyReportsTable();

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
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);
app.use("/api", router);
export default app;
