import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// Tabela de funcionários — cada funcionário pertence a um proprietário (userId)
export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  // O proprietário que criou este funcionário
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  // Senha em texto simples gerada pelo proprietário (sem hash, acesso simples)
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  // Permissões individuais
  canSellInventory: boolean("can_sell_inventory").notNull().default(true),
  canRegisterSale: boolean("can_register_sale").notNull().default(false),
  canViewReports: boolean("can_view_reports").notNull().default(false),
  canViewHistory: boolean("can_view_history").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
