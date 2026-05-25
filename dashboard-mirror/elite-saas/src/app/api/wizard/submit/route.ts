import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eliteSites } from "@/lib/schema";
import type { WizardState } from "@/lib/wizard-types";
import { getCurrentUser } from "@/lib/auth";
import { inferAccountFromDomain } from "@/lib/cf-account";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let state: WizardState;
  try {
    state = await req.json() as WizardState;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Validate required fields
  const domain = state?.step1?.domain?.trim();
  const businessName = state?.step4?.businessName?.trim();
  const scenario = state?.step3?.scenario;

  if (!domain) {
    return NextResponse.json({ ok: false, error: "Domain is required" }, { status: 400 });
  }
  if (!businessName) {
    return NextResponse.json({ ok: false, error: "Business name is required" }, { status: 400 });
  }
  if (!scenario) {
    return NextResponse.json({ ok: false, error: "Scenario is required" }, { status: 400 });
  }

  // Pick CF account by TLD. Ambiguous TLDs (.ai/.io/other) require state.step1.account
  // captured by the wizard; fall back to IT only if neither inference nor override is set.
  const accountInference = inferAccountFromDomain(domain);
  const account: "IT" | "EN" =
    accountInference !== "AMBIGUOUS"
      ? accountInference
      : state.step1.account === "EN"
      ? "EN"
      : "IT";

  try {
    const db = getDb();
    const now = Date.now();
    // UPSERT: re-submitting the wizard for an already-existing draft must
    // refresh the brief instead of failing on the PRIMARY KEY (domain).
    // Existing live/building rows are protected — only `draft`/`error` are
    // overwritten.
    await db
      .insert(eliteSites)
      .values({
        domain,
        account,
        businessName,
        status: "draft",
        agencyEmail: process.env.AGENCY_EMAIL ?? "missing",
        briefJson: JSON.stringify(state),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: eliteSites.domain,
        set: {
          account,
          businessName,
          briefJson: JSON.stringify(state),
          updatedAt: now,
        },
        // Don't overwrite a live or actively-building row.
        setWhere: sql`${eliteSites.status} IN ('draft','error','cancelled')`,
      });

    return NextResponse.json({ ok: true, domain });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown DB error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
