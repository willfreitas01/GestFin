import {
  pgTable,
  serial,
  integer,
  numeric,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const monthlyReportsTable = pgTable(
  "monthly_reports",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // Formato "YYYY-MM", ex: "2026-06"
    month: text("month").notNull(),
    totalIncome: numeric("total_income", { precision: 12, scale: 2 }).notNull(),
    totalExpenses: numeric("total_expenses", {
      precision: 12,
      scale: 2,
    }).notNull(),
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
    savingsRate: integer("savings_rate").notNull(),
    transactionCount: integer("transaction_count").notNull(),
    // Breakdown por categoria, congelado no momento do fechamento.
    // Formato: [{ category, label, total, percentage }, ...]
    byCategory: text("by_category").notNull(),
    closedAt: timestamp("closed_at").defaultNow().notNull(),
  },
  (table) => [
    // Um usuário só pode fechar cada mês uma vez.
    unique("monthly_reports_user_month_unique").on(table.userId, table.month),
  ],
);

export const insertMonthlyReportSchema = createInsertSchema(
  monthlyReportsTable,
).omit({ id: true, closedAt: true });
export type InsertMonthlyReport = z.infer<typeof insertMonthlyReportSchema>;
export type MonthlyReport = typeof monthlyReportsTable.$inferSelect;
