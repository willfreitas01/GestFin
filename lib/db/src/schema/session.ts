import {
  pgTable,
  varchar,
  json,
  timestamp,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// Esta tabela é usada pelo connect-pg-simple para armazenar as sessões de
// login (substituindo o MemoryStore em memória). Ela é criada/gerenciada via
// SQL direto no boot do servidor (artifacts/api-server/src/app.ts), não por
// este schema — mas precisamos declará-la aqui também para que o drizzle-kit
// "veja" que ela deve existir e não proponha removê-la (DROP TABLE) ao gerar
// migrações automáticas a partir do schema. O nome da constraint de chave
// primária é o mesmo criado pelo SQL manual ("session_pkey", o padrão do
// Postgres), para que o drizzle-kit não detecte uma diferença de nome.
export const sessionTable = pgTable(
  "session",
  {
    sid: varchar("sid").notNull(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (table) => [
    primaryKey({ name: "session_pkey", columns: [table.sid] }),
    index("IDX_session_expire").on(table.expire),
  ],
);
