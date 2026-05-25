import { eq, and, sql } from "drizzle-orm";
import { eliteUserSpend } from "./schema";
import type { Db } from "./db";

// Anthropic Haiku 4.5 pricing (the model the pipeline uses, see strategy.ts +
// content.ts). Cents per token. Input $1/M, Output $5/M, Cache read $0.10/M.
// If model changes, update these constants accordingly.
const INPUT_CENTS_PER_TOKEN = 0.0001;
const OUTPUT_CENTS_PER_TOKEN = 0.0005;
const CACHE_READ_CENTS_PER_TOKEN = 0.00001;

export type AnthropicSpend = {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
};

export function estimateAnthropicCostCents(usage: AnthropicSpend): number {
  const billableInput = Math.max(0, usage.inputTokens - usage.cacheReadInputTokens);
  const cents =
    billableInput * INPUT_CENTS_PER_TOKEN +
    usage.outputTokens * OUTPUT_CENTS_PER_TOKEN +
    usage.cacheReadInputTokens * CACHE_READ_CENTS_PER_TOKEN;
  return Math.ceil(cents);
}

export function currentYearMonth(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function addAnthropicSpend(db: Db, args: { userId: string; usage: AnthropicSpend }) {
  if (!args.userId) return; // anonymous job, skip tracking
  const yearMonth = currentYearMonth();
  const cents = estimateAnthropicCostCents(args.usage);
  const existing = await db
    .select()
    .from(eliteUserSpend)
    .where(and(eq(eliteUserSpend.userId, args.userId), eq(eliteUserSpend.yearMonth, yearMonth)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(eliteUserSpend).values({
      userId: args.userId,
      yearMonth,
      anthropicInputTokens: args.usage.inputTokens,
      anthropicOutputTokens: args.usage.outputTokens,
      anthropicCostCents: cents,
    });
  } else {
    await db
      .update(eliteUserSpend)
      .set({
        anthropicInputTokens: sql`${eliteUserSpend.anthropicInputTokens} + ${args.usage.inputTokens}`,
        anthropicOutputTokens: sql`${eliteUserSpend.anthropicOutputTokens} + ${args.usage.outputTokens}`,
        anthropicCostCents: sql`${eliteUserSpend.anthropicCostCents} + ${cents}`,
      })
      .where(and(eq(eliteUserSpend.userId, args.userId), eq(eliteUserSpend.yearMonth, yearMonth)));
  }
}

export async function addDataForSeoCall(db: Db, args: { userId: string; calls?: number }) {
  if (!args.userId) return;
  const yearMonth = currentYearMonth();
  const calls = args.calls ?? 1;
  const existing = await db
    .select()
    .from(eliteUserSpend)
    .where(and(eq(eliteUserSpend.userId, args.userId), eq(eliteUserSpend.yearMonth, yearMonth)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(eliteUserSpend).values({ userId: args.userId, yearMonth, dataforseoCalls: calls });
  } else {
    await db
      .update(eliteUserSpend)
      .set({ dataforseoCalls: sql`${eliteUserSpend.dataforseoCalls} + ${calls}` })
      .where(and(eq(eliteUserSpend.userId, args.userId), eq(eliteUserSpend.yearMonth, yearMonth)));
  }
}
