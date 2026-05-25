import { formatCents, formatTokens, type MonthlySpend } from "@/lib/spend";
import { makeT, type Lang } from "@/lib/i18n";

export function SpendWidget({ spend, lang }: { spend: MonthlySpend; lang: Lang }) {
  const t = makeT(lang);
  const noActivity =
    spend.anthropicInputTokens === 0 &&
    spend.anthropicOutputTokens === 0 &&
    spend.dataforseoCalls === 0;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
      <div className="text-zinc-500 font-medium">
        {t("spend.label")} {spend.yearMonth}
      </div>
      {noActivity ? (
        <span className="text-zinc-500">{t("spend.noActivity")}</span>
      ) : (
        <>
          <div className="flex items-baseline gap-1">
            <span className="text-zinc-500">Anthropic:</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {formatCents(spend.anthropicCostCents)}
            </span>
            <span className="text-[10px] text-zinc-400">
              ({formatTokens(spend.anthropicInputTokens)} in / {formatTokens(spend.anthropicOutputTokens)} out)
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-zinc-500">DataForSEO:</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {spend.dataforseoCalls}
            </span>
            <span className="text-[10px] text-zinc-400">{t("spend.calls")}</span>
          </div>
          {(spend.freepikCalls > 0 || spend.unsplashCalls > 0) && (
            <div className="flex items-baseline gap-2 text-zinc-500">
              <span>Img:</span>
              {spend.freepikCalls > 0 && (
                <span><span className="font-mono">{spend.freepikCalls}</span> Freepik</span>
              )}
              {spend.unsplashCalls > 0 && (
                <span><span className="font-mono">{spend.unsplashCalls}</span> Unsplash</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
