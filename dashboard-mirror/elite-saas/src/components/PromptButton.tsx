"use client";

import { useState } from "react";
import { makeT, type Lang } from "@/lib/i18n";

type Scope = "content" | "config" | "all";

type PromptResult =
  | { ok: true; commitSha: string; filesChanged: string[]; modelUsage?: unknown }
  | { ok: false; error: string; status?: number };

// Canned prompt bodies stay Italian on purpose: the generated sites are
// Italian, so the instruction sent to Claude must match the site language.
// Only the button labels are translated via the i18n dictionary.
const CANNED: { labelKey: string; scope: Scope; prompt: string }[] = [
  { labelKey: "prompt.cannedAudit", scope: "content", prompt: "Controlla che tutti i link interni negli articoli e nelle pagine risolvano a pagine esistenti del sito; correggi quelli rotti mantenendo l'ancora coerente." },
  { labelKey: "prompt.cannedHero", scope: "content", prompt: "Riscrivi il primo paragrafo della home (hero) in modo più incisivo e orientato alla conversione, mantenendo tono e lingua del sito." },
  { labelKey: "prompt.cannedFormal", scope: "content", prompt: "Alza la formalità del testo a un registro professionale (4-5 su 5) su tutte le pagine, senza cambiare i contenuti." },
];

// Map an HTTP status + raw error string to a clear, translatable message key.
// status === 0 signals a network/fetch failure (request never completed).
function explainErrorKey(status: number | undefined, raw: string): string {
  if (status === 0) return "prompt.errNetwork";
  const r = (raw || "").toLowerCase();
  if (status === 401 || status === 403 || /unauthor|authentication|invalid api|invalid token|\btoken\b|\b1000\b|\b10000\b/.test(r)) return "prompt.errAuth";
  if (status === 404 || /not found/.test(r)) return "prompt.errNotFound";
  if (status === 409 || /must be live|is draft|is error|is building/.test(r)) return "prompt.errNotLive";
  if (status === 500 || /not configured|workflow_url|shared_secret|secret/.test(r)) return "prompt.errConfig";
  return "prompt.errWorker";
}

export function PromptButton({ domain, status, lang }: { domain: string; status: string; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<PromptResult | null>(null);
  const t = makeT(lang);

  if (status !== "live") return null;

  function reset() {
    setConfirming(false);
    setResult(null);
  }

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/sites/${encodeURIComponent(domain)}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), scope }),
      });
      let json: PromptResult;
      try {
        json = (await res.json()) as PromptResult;
      } catch {
        json = { ok: false, error: `HTTP ${res.status}`, status: res.status };
      }
      // Trust the HTTP status: a non-2xx with a malformed/ok-less body is still an error.
      if (!res.ok && (json as { ok?: boolean }).ok !== false && !(json as { ok?: boolean }).ok) {
        json = { ok: false, error: (json as { error?: string }).error || `HTTP ${res.status}`, status: res.status };
      } else if (json.ok === false) {
        json = { ...json, status: res.status };
      }
      setResult(json);
    } catch (err) {
      // Request never completed → network failure.
      setResult({ ok: false, error: err instanceof Error ? err.message : "network error", status: 0 });
    } finally {
      setBusy(false);
      setConfirming(false);
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
                  onClick={() => { setPrompt(c.prompt); setScope(c.scope); reset(); }}
                  className="text-[10px] px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  {t(c.labelKey)}
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value.slice(0, 2000)); if (result || confirming) reset(); }}
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

            {confirming ? (
              <div className="rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{t("prompt.confirmTitle")}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">{t("prompt.confirmBody")}</p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="text-xs px-3 py-1.5 rounded text-zinc-500 hover:text-zinc-700 disabled:opacity-50">{t("prompt.back")}</button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={busy}
                    className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy ? t("prompt.applying") : t("prompt.confirm")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => !busy && setOpen(false)} className="text-xs px-3 py-1.5 rounded text-zinc-500 hover:text-zinc-700">{t("prompt.cancel")}</button>
                <button
                  type="button"
                  onClick={() => { setResult(null); setConfirming(true); }}
                  disabled={busy || prompt.trim().length === 0}
                  className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("prompt.apply")}
                </button>
              </div>
            )}

            {result && (
              result.ok ? (
                <div className="text-xs rounded border p-3 border-zinc-200 dark:border-zinc-700">
                  {result.filesChanged.length === 0 ? (
                    <p className="text-amber-600 dark:text-amber-400">{t("prompt.noChange")}</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-emerald-600 dark:text-emerald-400">{t("prompt.appliedPrefix")} <span className="font-mono">{result.commitSha.slice(0, 7)}</span>{t("prompt.appliedSuffix")}</p>
                      <ul className="list-disc list-inside text-zinc-500">
                        {result.filesChanged.map((f) => <li key={f} className="font-mono text-[10px]">{f}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs rounded border p-3 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 space-y-1">
                  <p className="text-red-600 dark:text-red-400 font-medium">{t(explainErrorKey(result.status, result.error))}</p>
                  {result.error && (
                    <p className="text-[10px] text-zinc-500">
                      <span className="opacity-70">{t("prompt.errDetail")}:</span> <span className="font-mono">{result.error}</span>
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}
