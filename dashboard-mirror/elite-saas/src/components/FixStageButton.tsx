"use client";

import { useState } from "react";
import { makeT, type Lang } from "@/lib/i18n";

type Fix = { id: string; label: string; destructive?: boolean };

type DiagnoseResult =
  | { ok: true; stage?: string; rootCause: string; evidence?: Record<string, unknown>; proposedFixes?: Fix[] }
  | { ok: false; error: string };

type ApplyResult =
  | { ok: true; applied: string; verify?: Record<string, unknown>; status?: string }
  | { ok: false; error: string };

async function call(domain: string, action: string, note: string) {
  const res = await fetch(`/api/builds/fix-stage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, action, note: note.trim() || undefined }),
  });
  return (await res.json()) as DiagnoseResult & ApplyResult;
}

function Evidence({ evidence, label }: { evidence: Record<string, unknown>; label: string }) {
  const entries = Object.entries(evidence);
  if (entries.length === 0) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
      <ul className="list-none p-0 m-0 space-y-0.5">
        {entries.map(([k, v]) => (
          <li key={k} className="font-mono text-[10px] text-zinc-500">
            {k}: {typeof v === "string" ? v : JSON.stringify(v)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FixStageButton({ domain, status, lang }: { domain: string; status: string; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [diag, setDiag] = useState<DiagnoseResult | null>(null);
  const [applied, setApplied] = useState<ApplyResult | null>(null);
  const t = makeT(lang);

  if (status !== "error" && status !== "building") return null;

  async function diagnose() {
    setBusy(true);
    setApplied(null);
    setDiag(null);
    try {
      setDiag(await call(domain, "diagnose", note));
    } catch (err) {
      setDiag({ ok: false, error: err instanceof Error ? err.message : "unknown" });
    } finally {
      setBusy(false);
    }
  }

  async function confirmFix(fixId: string) {
    setBusy(true);
    setApplied(null);
    try {
      setApplied(await call(domain, `confirm:${fixId}`, note));
    } catch (err) {
      setApplied({ ok: false, error: err instanceof Error ? err.message : "unknown" });
    } finally {
      setBusy(false);
    }
  }

  function openPanel() {
    setOpen(true);
    void diagnose();
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="text-[10px] text-red-500 hover:underline"
        title={`${t("fix.title")} ${domain}`}
      >
        {t("fix.open")} ↗
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">{t("fix.title")} <span className="font-mono">{domain}</span></h2>
              <button type="button" onClick={() => !busy && setOpen(false)} className="text-zinc-400 hover:text-zinc-600 text-lg leading-none">×</button>
            </div>

            {busy && !diag && <p className="text-xs text-zinc-500">{t("fix.diagnosing")}</p>}

            {diag && (diag.ok ? (
              <div className="space-y-3">
                <div className="text-xs rounded border p-3 border-zinc-200 dark:border-zinc-700 space-y-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-zinc-400">{t("fix.rootCause")}{diag.stage ? ` · ${diag.stage}` : ""}</span>
                    <p className="text-zinc-700 dark:text-zinc-200">{diag.rootCause}</p>
                  </div>
                  {diag.evidence && <Evidence evidence={diag.evidence} label={t("fix.evidence")} />}
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">{t("fix.proposedFixes")}</p>
                  {(diag.proposedFixes ?? []).length === 0 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">{t("fix.noFixes")}</p>
                  ) : (
                    (diag.proposedFixes ?? []).map((f) => (
                      <div key={f.id} className="flex items-center justify-between gap-2 rounded border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5">
                        <span className="text-xs text-zinc-700 dark:text-zinc-200">
                          {f.label}
                          {f.destructive && <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300 uppercase">{t("fix.destructive")}</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => confirmFix(f.id)}
                          disabled={busy}
                          className={`text-[11px] px-2.5 py-1 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed ${f.destructive ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"}`}
                        >
                          {busy ? t("fix.applying") : t("fix.confirm")}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-red-600 dark:text-red-400">{t("fix.errorPrefix")} {diag.error}</p>
            ))}

            {applied && (
              <div className="text-xs rounded border p-3 border-zinc-200 dark:border-zinc-700">
                {applied.ok ? (
                  <div className="space-y-1">
                    <p className="text-emerald-600 dark:text-emerald-400">{t("fix.appliedPrefix")} <span className="font-mono">{applied.applied}</span>{applied.status ? ` → ${applied.status}` : ""}</p>
                    {applied.verify && <Evidence evidence={applied.verify} label={t("fix.verifyAfter")} />}
                  </div>
                ) : (
                  <p className="text-red-600 dark:text-red-400">{t("fix.errorPrefix")} {applied.error}</p>
                )}
              </div>
            )}

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={2}
              placeholder={t("fix.notePlaceholder")}
              className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-transparent p-2 resize-y"
            />

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => !busy && setOpen(false)} className="text-xs px-3 py-1.5 rounded text-zinc-500 hover:text-zinc-700">{t("fix.cancel")}</button>
              <button
                type="button"
                onClick={diagnose}
                disabled={busy}
                className="text-xs px-3 py-1.5 rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50"
              >
                {busy ? t("fix.diagnosing") : t("fix.rediagnose")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
