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
await ensureSessionTable();

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
