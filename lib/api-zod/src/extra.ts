/**
 * Schemas escritos manualmente, fora do pipeline de geração do orval
 * (que vive em ./generated/). Adicionados aqui para não correr o risco de
 * serem sobrescritos numa regeneração futura da spec OpenAPI.
 */
import * as zod from "zod";

/**
 * @summary Close (freeze) a monthly report
 */
export const CloseMonthlyReportBody = zod.object({
  month: zod.string().describe("YYYY-MM format"),
});

export const CloseMonthlyReportResponse = zod.object({
  month: zod.string(),
  closed: zod.literal(true),
  closedAt: zod.string(),
  totalIncome: zod.number(),
  totalExpenses: zod.number(),
  balance: zod.number(),
  savingsRate: zod.number(),
  transactionCount: zod.number(),
  byCategory: zod.array(
    zod.object({
      category: zod.string(),
      label: zod.string(),
      total: zod.number(),
      percentage: zod.number(),
    }),
  ),
});

/**
 * @summary List all months that have been closed (frozen) by the user
 */
export const ListClosedMonthsResponseItem = zod.object({
  month: zod.string(),
  closedAt: zod.string(),
});
export const ListClosedMonthsResponse = zod.array(ListClosedMonthsResponseItem);
