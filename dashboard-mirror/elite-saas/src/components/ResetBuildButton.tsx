"use client";

import { useState } from "react";
import { makeT, type Lang } from "@/lib/i18n";

export function ResetBuildButton({ domain, status, lang }: { domain: string; status: string; lang: Lang }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const t = makeT(lang);

  if (status !== "building" && status !== "error") return null;

  async function reset() {
    if (!confirm(t("reset.confirm").replace("{domain}", domain))) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/builds/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setMsg(`${t("build.errorPrefix")} ${json.error ?? res.statusText}`);
      } else {
        setMsg(t("reset.done"));
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (err) {
      setMsg(`${t("build.errorPrefix")} ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={reset}
        disabled={busy}
        className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
        type="button"
        title={t("reset.title")}
      >
        {busy ? "..." : t("reset.label")}
      </button>
      {msg && <span className="text-[10px] text-zinc-500">{msg}</span>}
    </span>
  );
}
