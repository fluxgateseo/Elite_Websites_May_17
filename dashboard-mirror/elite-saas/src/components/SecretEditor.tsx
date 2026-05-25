"use client";

import { useState } from "react";

type SaveStatus = "idle" | "saving" | "ok" | "error";

interface SecretEditorProps {
  name: string;
  isSensitive: boolean;
}

export function SecretEditor({ name, isSensitive }: SecretEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  function handleCancel() {
    setEditing(false);
    setValue("");
    setStatus("idle");
    setErrorMsg("");
  }

  async function handleSave() {
    if (!value.trim() || status === "saving") return;

    setStatus("saving");
    setErrorMsg("");

    try {
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // value is sent as JSON text — not rendered as HTML anywhere
        body: JSON.stringify({ name, value }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        results?: { binding: string; ok: boolean; error?: string }[];
        error?: string;
      };

      if (data.ok) {
        setStatus("ok");
        // Reload after short delay so server-rendered status refreshes
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        const failedBindings = data.results?.filter((r) => !r.ok) ?? [];
        const msg =
          failedBindings.length > 0
            ? failedBindings.map((r) => r.error ?? `${r.binding} failed`).join("; ")
            : (data.error ?? "Unknown error");
        setStatus("error");
        setErrorMsg(msg);
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error — could not reach server");
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
      >
        Update
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[220px]">
      <div className="flex gap-1.5 items-center">
        <input
          type={isSensitive ? "password" : "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isSensitive ? "Paste secret value…" : "Enter value…"}
          autoFocus
          disabled={status === "saving" || status === "ok"}
          className="flex-1 text-xs font-mono px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <button
          onClick={handleSave}
          disabled={!value.trim() || status === "saving" || status === "ok"}
          className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {status === "saving" ? "Saving…" : status === "ok" ? "Saved!" : "Save"}
        </button>
        <button
          onClick={handleCancel}
          disabled={status === "saving"}
          className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-40 transition-colors"
        >
          Cancel
        </button>
      </div>
      {status === "error" && errorMsg && (
        <p className="text-xs text-red-500">{errorMsg}</p>
      )}
    </div>
  );
}
