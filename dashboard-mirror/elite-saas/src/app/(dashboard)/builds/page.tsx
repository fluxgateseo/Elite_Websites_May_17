import { desc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eliteSites } from "@/lib/schema";
import { SitesTable } from "@/components/SitesTable";
import { AccountFilter } from "@/components/AccountFilter";
import { getLang } from "@/lib/i18n-server";
import { makeT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const IN_PROGRESS_STATUSES = ["draft", "building", "error"];

export default async function Page({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const params = await searchParams;
  const account = params.account === "IT" || params.account === "EN" ? params.account : null;
  const lang = await getLang();
  const t = makeT(lang);

  const db = getDb();
  const all = await db
    .select()
    .from(eliteSites)
    .where(inArray(eliteSites.status, IN_PROGRESS_STATUSES))
    .orderBy(desc(eliteSites.updatedAt))
    .all();
  const rows = account ? all.filter((r) => r.account === account) : all;

  const counts = {
    all: all.length,
    IT: all.filter((r) => r.account === "IT").length,
    EN: all.filter((r) => r.account === "EN").length,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("builds.title")}</h1>
      <p className="text-zinc-500 text-sm">{t("builds.desc")}</p>

      <AccountFilter counts={counts} lang={lang} />

      <SitesTable
        sites={rows}
        emptyMessage={t("builds.empty")}
        lang={lang}
      />
    </div>
  );
}
