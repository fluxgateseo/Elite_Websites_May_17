"use client";

import { useState } from "react";
import { makeT, type Lang } from "@/lib/i18n";

export function StartBuildButton({ domain, status, lang, dryRunDefault = false }: { domain: string; status: string; lang: Lang; dryRunDefault?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(dryRunDefault);
  const t = makeT(lang);

  if (status !== "draft" && status !== "error") return null;

  async function start() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/builds/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, dryRun }),
      });
      const json = (await res.json()) as { ok: boolean; jobId?: string; instanceId?: string; error?: string; needsBrief?: boolean; wizardUrl?: string };
      if (json.needsBrief && json.wizardUrl) {
        // No brief yet → guide the operator into the wizard to collect the
        // site info before any build runs.
        setMsg(t("build.needsBrief"));
        window.location.href = json.wizardUrl;
        return;
      }
      if (!res.ok || !json.ok) {
        setMsg(`${t("build.errorPrefix")} ${json.error ?? res.statusText}`);
      } else {
        setMsg(`${t("build.startedPrefix")} ${json.jobId?.slice(0, 8)}${t("build.startedSuffix")}`);
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err) {
      setMsg(`${t("build.errorPrefix")} ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <label className="text-[10px] text-zinc-500 inline-flex items-center gap-1 select-none">
        <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="h-3 w-3" /> {t("build.dryRun")}
      </label>
      <button
        onClick={start}
        disabled={busy}
        className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
      >
        {busy ? "..." : t("build.start")}
      </button>
      {msg && <span className="text-[10px] text-zinc-500">{msg}</span>}
    </span>
  );
}
