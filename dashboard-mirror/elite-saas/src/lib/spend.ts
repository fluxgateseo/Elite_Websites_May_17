import { and, eq } from "drizzle-orm";
import { eliteUserSpend } from "./schema";
import type { DB } from "./db";

export type MonthlySpend = {
  userId: string;
  yearMonth: string;
  anthropicInputTokens: number;
  anthropicOutputTokens: number;
  anthropicCostCents: number;
  dataforseoCalls: number;
  dataforseoCostCents: number;
  freepikCalls: number;
  unsplashCalls: number;
};

export function currentYearMonth(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function getMonthlySpend(db: DB, args: { userId: string; yearMonth?: string }): Promise<MonthlySpend> {
  const yearMonth = args.yearMonth ?? currentYearMonth();
  const rows = await db
    .select()
    .from(eliteUserSpend)
    .where(and(eq(eliteUserSpend.userId, args.userId), eq(eliteUserSpend.yearMonth, yearMonth)))
    .limit(1);
  const row = rows[0];
  return {
    userId: args.userId,
    yearMonth,
    anthropicInputTokens: row?.anthropicInputTokens ?? 0,
    anthropicOutputTokens: row?.anthropicOutputTokens ?? 0,
    anthropicCostCents: row?.anthropicCostCents ?? 0,
    dataforseoCalls: row?.dataforseoCalls ?? 0,
    dataforseoCostCents: row?.dataforseoCostCents ?? 0,
    freepikCalls: row?.freepikCalls ?? 0,
    unsplashCalls: row?.unsplashCalls ?? 0,
  };
}

export function formatCents(cents: number): string {
  if (cents === 0) return "$0";
  if (cents < 100) return `${cents}¢`;
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens === 0) return "0";
  if (tokens < 1000) return String(tokens);
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${(tokens / 1_000_000).toFixed(2)}M`;
}
