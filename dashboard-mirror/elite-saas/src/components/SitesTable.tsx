import Link from "next/link";
import { StartBuildButton } from "./StartBuildButton";
import { ResetBuildButton } from "./ResetBuildButton";
import { PipelineProgress } from "./PipelineProgress";
import { PromptButton } from "./PromptButton";
import { FixStageButton } from "./FixStageButton";
import { makeT, type Lang } from "@/lib/i18n";

export interface SiteRow {
  domain: string;
  businessName: string;
  status: string;
  account: string;
  createdAt: number;
  updatedAt: number;
  cloudflarePagesProject: string | null;
  githubRepo: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
  building: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  live: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
  error: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
  paused: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
};

function formatDate(ts: number, lang: Lang): string {
  return new Date(ts).toLocaleDateString(lang === "en" ? "en-GB" : "it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SitesTable({
  sites,
  emptyMessage,
  lang,
}: {
  sites: SiteRow[];
  emptyMessage: string;
  lang: Lang;
}) {
  const t = makeT(lang);

  if (sites.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-6 py-10 text-center">
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
        <Link
          href="/nuovo-sito"
          className="inline-block mt-3 text-xs text-blue-500 hover:underline"
        >
          {t("sites.createFirst")}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left">{t("table.status")}</th>
            <th className="px-3 py-2 text-left">{t("table.acc")}</th>
            <th className="px-3 py-2 text-left">{t("table.domain")}</th>
            <th className="px-3 py-2 text-left">{t("table.business")}</th>
            <th className="px-3 py-2 text-left">{t("table.updated")}</th>
            <th className="px-3 py-2 text-left">{t("table.resources")}</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((s) => {
            const cls = STATUS_STYLE[s.status] ?? STATUS_STYLE.draft;
            const label = t(`status.${s.status}`);
            return (
              <tr key={s.domain} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-medium ${cls}`}>
                    {label}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      "inline-block px-1.5 py-0.5 rounded text-[10px] font-mono " +
                      (s.account === "EN"
                        ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                        : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300")
                    }
                    title={s.account === "EN" ? t("acc.enTitle") : t("acc.itTitle")}
                  >
                    {s.account}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {s.status === "live" ? (
                    <a
                      href={`https://${s.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {s.domain} ↗
                    </a>
                  ) : (
                    <span>{s.domain}</span>
                  )}
                </td>
                <td className="px-3 py-2">{s.businessName}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">{formatDate(s.updatedAt, lang)}</td>
                <td className="px-3 py-2 text-xs space-x-2">
                  {s.githubRepo && (
                    <a
                      href={`https://github.com/${s.githubRepo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      repo ↗
                    </a>
                  )}
                  {s.cloudflarePagesProject && (
                    <a
                      href={`https://dash.cloudflare.com/?to=/:account/pages/view/${s.cloudflarePagesProject}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      pages ↗
                    </a>
                  )}
                  <StartBuildButton domain={s.domain} status={s.status} lang={lang} />
                  <ResetBuildButton domain={s.domain} status={s.status} lang={lang} />
                  <PromptButton domain={s.domain} status={s.status} lang={lang} />
                  <FixStageButton domain={s.domain} status={s.status} lang={lang} />
                  {(s.status === "building" || s.status === "error") && (
                    <PipelineProgress domain={s.domain} polling={s.status === "building"} lang={lang} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
