"use client";

import { useState } from "react";
import { makeT, type Lang } from "@/lib/i18n";

type Scope = "content" | "config" | "all";

type PromptResult =
  | { ok: true; commitSha: string; filesChanged: string[]; modelUsage?: unknown }
  | { ok: false; error: string };

// Canned prompt bodies stay Italian on purpose: the generated sites are
// Italian, so the instruction sent to Claude must match the site language.
// Only the button labels are translated via the i18n dictionary.
const CANNED: { labelKey: string; scope: Scope; prompt: string }[] = [
  { labelKey: "prompt.cannedAudit", scope: "content", prompt: "Controlla che tutti i link interni negli articoli e nelle pagine risolvano a pagine esistenti del sito; correggi quelli rotti mantenendo l'ancora coerente." },
  { labelKey: "prompt.cannedHero", scope: "content", prompt: "Riscrivi il primo paragrafo della home (hero) in modo più incisivo e orientato alla conversione, mantenendo tono e lingua del sito." },
  { labelKey: "prompt.cannedFormal", scope: "content", prompt: "Alza la formalità del testo a un registro professionale (4-5 su 5) su tutte le pagine, senza cambiare i contenuti." },
];

export function PromptButton({ domain, status, lang }: { domain: string; status: string; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PromptResult | null>(null);
  const t = makeT(lang);

  if (status !== "live") return null;

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/sites/${encodeURIComponent(domain)}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), scope }),
      });
      const json = (await res.json()) as PromptResult;
      setResult(json);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "unknown" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-blue-500 hover:underline"
        title={`${t("prompt.titlePrefix")} ${domain}`}
      >
        {t("prompt.open")} ↗
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">{t("prompt.titlePrefix")} <span className="font-mono">{domain}</span></h2>
              <button type="button" onClick={() => !busy && setOpen(false)} className="text-zinc-400 hover:text-zinc-600 text-lg leading-none">×</button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CANNED.map((c) => (
                <button
                  key={c.labelKey}
                  type="button"
                  onClick={() => { setPrompt(c.prompt); setScope(c.scope); }}
                  className="text-[10px] px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  {t(c.labelKey)}
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
              rows={5}
              placeholder={t("prompt.placeholder")}
              className="w-full text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-transparent p-2 resize-y"
            />

            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-zinc-500 inline-flex items-center gap-2">
                {t("prompt.scope")}
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as Scope)}
                  className="text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-1.5 py-1"
                >
                  <option value="content">content</option>
                  <option value="config">config</option>
                  <option value="all">all</option>
                </select>
              </label>
              <span className="text-[10px] text-zinc-400">{prompt.length}/2000</span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => !busy && setOpen(false)} className="text-xs px-3 py-1.5 rounded text-zinc-500 hover:text-zinc-700">{t("prompt.cancel")}</button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || prompt.trim().length === 0}
                className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? t("prompt.applying") : t("prompt.apply")}
              </button>
            </div>

            {result && (
              <div className="text-xs rounded border p-3 border-zinc-200 dark:border-zinc-700">
                {result.ok ? (
                  result.filesChanged.length === 0 ? (
                    <p className="text-amber-600 dark:text-amber-400">{t("prompt.noChange")}</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-emerald-600 dark:text-emerald-400">{t("prompt.appliedPrefix")} <span className="font-mono">{result.commitSha.slice(0, 7)}</span>{t("prompt.appliedSuffix")}</p>
                      <ul className="list-disc list-inside text-zinc-500">
                        {result.filesChanged.map((f) => <li key={f} className="font-mono text-[10px]">{f}</li>)}
                      </ul>
                    </div>
                  )
                ) : (
                  <p className="text-red-600 dark:text-red-400">{t("prompt.errorPrefix")} {result.error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
