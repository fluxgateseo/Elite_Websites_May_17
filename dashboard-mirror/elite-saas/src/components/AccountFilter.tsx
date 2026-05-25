"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { makeT, type Lang } from "@/lib/i18n";

const OPTIONS = [
  { value: "all", labelKey: "filter.all" },
  { value: "IT", labelKey: null },
  { value: "EN", labelKey: null },
] as const;

export function AccountFilter({ counts, lang }: { counts?: { all: number; IT: number; EN: number }; lang: Lang }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("account");
  const active = current === "IT" || current === "EN" ? current : "all";
  const t = makeT(lang);

  function set(value: "all" | "IT" | "EN") {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete("account");
    else next.set("account", value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="inline-flex rounded-md border border-zinc-300 dark:border-zinc-700 overflow-hidden text-xs">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => set(o.value)}
          className={
            "px-3 py-1 transition-colors " +
            (active === o.value
              ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900"
              : "bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400")
          }
        >
          {o.labelKey ? t(o.labelKey) : o.value}
          {counts ? <span className="ml-1 text-zinc-500">({counts[o.value]})</span> : null}
        </button>
      ))}
    </div>
  );
}
