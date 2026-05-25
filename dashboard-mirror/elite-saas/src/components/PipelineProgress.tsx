"use client";

import { useEffect, useState } from "react";
import { makeT, type Lang } from "@/lib/i18n";

type StageStatus = {
  stage: string;
  status: "ok" | "error" | null;
  error: string | null;
  finishedAt: number | null;
};

type StatusResponse = {
  ok: boolean;
  job?: {
    id: string;
    domain: string;
    status: string;
    currentStage: string | null;
    finishedAt: number | null;
  };
  stages?: StageStatus[];
  workflowStatus?: string | null;
  error?: string;
};

const STAGE_LABELS: Record<string, string> = {
  intel: "Intel",
  strategy: "Strategy",
  content: "Content",
  images: "Images",
  repo: "Repo",
  pages: "CF Pages",
  verify: "Verify",
};

export function PipelineProgress({ domain, polling = true, lang }: { domain: string; polling?: boolean; lang: Lang }) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [open, setOpen] = useState(false);
  const t = makeT(lang);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function pull() {
      try {
        const res = await fetch(`/api/builds/status?domain=${encodeURIComponent(domain)}`);
        if (!res.ok) return;
        const json = (await res.json()) as StatusResponse;
        if (!mounted) return;
        setData(json);
        // Re-poll only if a job is still in flight.
        if (polling && json.ok && json.job && (json.job.status === "running" || json.job.status === "queued")) {
          timer = setTimeout(pull, 5000);
        }
      } catch {
        // swallow
      }
    }

    if (open) pull();
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [domain, open, polling]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] text-blue-500 hover:underline"
      >
        {t("progress.show")}
      </button>
    );
  }

  if (!data || !data.ok) {
    return <span className="text-[10px] text-zinc-500">{t("progress.loading")}</span>;
  }
  if (!data.job) {
    return <span className="text-[10px] text-zinc-500">{t("progress.noJob")}</span>;
  }

  return (
    <div className="text-[10px] mt-1 space-y-0.5">
      <div className="text-zinc-600">
        job <span className="font-mono">{data.job.id.slice(0, 8)}…</span> · {data.job.status}
        {data.workflowStatus && data.workflowStatus !== data.job.status && ` (wf: ${data.workflowStatus})`}
      </div>
      {(data.stages ?? []).map((s) => {
        const isCurrent = data.job!.currentStage === s.stage && data.job!.status === "running";
        const dot = s.status === "ok" ? "●" : s.status === "error" ? "✗" : isCurrent ? "◐" : "○";
        const cls =
          s.status === "ok"
            ? "text-emerald-600"
            : s.status === "error"
            ? "text-red-600"
            : isCurrent
            ? "text-blue-500"
            : "text-zinc-400";
        return (
          <div key={s.stage} className={cls}>
            {dot} {STAGE_LABELS[s.stage] ?? s.stage}
            {s.error && <span className="ml-1 text-zinc-500">— {s.error.slice(0, 80)}</span>}
          </div>
        );
      })}
    </div>
  );
}
