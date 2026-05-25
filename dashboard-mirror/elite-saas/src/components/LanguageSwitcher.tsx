"use client";

import type { Lang } from "@/lib/i18n";

const FLAG: Record<Lang, string> = { it: "🇮🇹", en: "🇬🇧" };
const LABEL: Record<Lang, string> = { it: "Italiano", en: "English" };

// variant "floating" → absolute top-right (auth pages); "inline" → flows in
// a header/toolbar (dashboard).
export function LanguageSwitcher({
  current,
  variant = "floating",
}: {
  current: Lang;
  variant?: "floating" | "inline";
}) {
  function setLang(lang: Lang) {
    if (lang === current) return;
    document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  const wrap =
    variant === "floating"
      ? "elite-lang-switch absolute top-4 right-4 z-10 "
      : "elite-lang-switch ";

  return (
    <div
      className={
        wrap +
        "inline-flex rounded border border-zinc-300 dark:border-zinc-700 overflow-hidden text-sm bg-white/80 dark:bg-zinc-900/80 backdrop-blur"
      }
    >
      {(["it", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-current={current === l ? "true" : undefined}
          aria-label={LABEL[l]}
          title={LABEL[l]}
          className={
            "px-2 py-1 leading-none transition-colors " +
            (current === l
              ? "bg-zinc-200 dark:bg-zinc-700 grayscale-0 opacity-100"
              : "opacity-50 grayscale hover:opacity-100 hover:grayscale-0")
          }
        >
          <span aria-hidden>{FLAG[l]}</span>
        </button>
      ))}
    </div>
  );
}
