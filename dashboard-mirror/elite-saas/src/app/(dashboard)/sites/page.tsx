import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eliteSites } from "@/lib/schema";
import { SitesTable } from "@/components/SitesTable";
import { AccountFilter } from "@/components/AccountFilter";
import { SpendWidget } from "@/components/SpendWidget";
import { getCurrentUser } from "@/lib/auth";
import { getMonthlySpend } from "@/lib/spend";
import { getLang } from "@/lib/i18n-server";
import { makeT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const params = await searchParams;
  const account = params.account === "IT" || params.account === "EN" ? params.account : null;
  const user = await getCurrentUser();
  const lang = await getLang();
  const t = makeT(lang);

  const db = getDb();
  const all = await db.select().from(eliteSites).orderBy(desc(eliteSites.updatedAt)).all();
  const rows = account ? all.filter((r) => r.account === account) : all;
  const spend = user ? await getMonthlySpend(db, { userId: user.id }) : null;

  const counts = {
    all: all.length,
    IT: all.filter((r) => r.account === "IT").length,
    EN: all.filter((r) => r.account === "EN").length,
  };
  const view = {
    total: rows.length,
    live: rows.filter((r) => r.status === "live").length,
    building: rows.filter((r) => r.status === "building" || r.status === "draft").length,
    error: rows.filter((r) => r.status === "error").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{t("sites.title")}</h1>
        <Link
          href="/nuovo-sito"
          className="text-xs px-3 py-1.5 rounded bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
        >
          {t("nav.newSite")}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
        <AccountFilter counts={counts} lang={lang} />
        <span>{view.total} {view.total === 1 ? t("sites.siteOne") : t("sites.siteOther")}</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />{view.live} {t("sites.live")}</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />{view.building} {t("sites.building")}</span>
        {view.error > 0 && (
          <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />{view.error} {t("sites.error")}</span>
        )}
      </div>

      {spend && <SpendWidget spend={spend} lang={lang} />}

      <SitesTable sites={rows} emptyMessage={t("sites.empty")} lang={lang} />
    </div>
  );
}
