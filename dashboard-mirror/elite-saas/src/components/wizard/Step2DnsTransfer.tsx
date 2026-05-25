"use client";

import { useState } from "react";
import { WizardState, PreflightResult } from "@/lib/wizard-types";
import { StepNav } from "./StepNav";

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

function CollapsibleCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
      >
        <span>{title}</span>
        <span className="text-zinc-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-zinc-600 dark:text-zinc-400 space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function Step2DnsTransfer({ state, onChange, onNext, onBack }: Props) {
  const [reverifying, setReverifying] = useState(false);
  const registrar = state.step1.preflightResult?.whois?.registrar;
  const cfPresent = state.step1.preflightResult?.cf_zone?.present;

  async function reverify() {
    setReverifying(true);
    try {
      const res = await fetch("/api/wizard/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: state.step1.domain }),
      });
      const data = await res.json() as PreflightResult;
      onChange({
        step1: {
          ...state.step1,
          preflightResult: data,
          preflightDone: true,
        },
      });
    } catch {
      // ignore
    } finally {
      setReverifying(false);
    }
  }

  const canProceed = (state.step2.cfAdded && state.step2.nsChanged) || state.step2.skipped || cfPresent;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Trasferiamo il DNS a Cloudflare</h1>
      <p className="text-zinc-500 mt-1 mb-6 text-sm">
        Il dominio <strong>{state.step1.domain}</strong> non è ancora nella tua zona Cloudflare.
        Segui uno dei percorsi qui sotto.
      </p>

      <div className="max-w-lg space-y-4">
        <CollapsibleCard title="Hai già il dominio su Cloudflare?">
          <p>Vai su <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">dashboard.cloudflare.com</a> → <strong>Add a site</strong>.</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Inserisci <strong>{state.step1.domain}</strong></li>
            <li>Scegli il piano Free</li>
            <li>Cloudflare ti mostrerà i nameserver da impostare</li>
            <li>Imposta quei nameserver nel pannello del tuo registrar</li>
          </ol>
        </CollapsibleCard>

        <CollapsibleCard title={`Devi cambiare nameservers${registrar && registrar !== "N/A" && registrar !== "Timeout o error" ? ` su ${registrar}` : ""}?`}>
          <p>Dopo aver aggiunto il dominio a Cloudflare, vai sul pannello del tuo registrar e cerca la sezione <strong>Nameserver / DNS</strong>.</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Accedi al pannello del registrar ({registrar ?? "es. Netsons, Register.it"})</li>
            <li>Vai su Gestione Dominio → Nameserver</li>
            <li>Sostituisci i nameserver attuali con quelli forniti da Cloudflare</li>
            <li>Salva le modifiche (la propagazione può richiedere fino a 48h)</li>
          </ol>
          <p className="text-xs text-zinc-400">Nota: su Netsons trovi i nameserver in <em>Dominia → Gestisci → DNS/Nameserver</em>.</p>
        </CollapsibleCard>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={state.step2.cfAdded}
              onChange={(e) => onChange({ step2: { ...state.step2, cfAdded: e.target.checked } })}
              className="w-4 h-4 rounded border-zinc-300 accent-blue-600"
            />
            <span className="text-sm">Ho aggiunto il dominio a Cloudflare</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={state.step2.nsChanged}
              onChange={(e) => onChange({ step2: { ...state.step2, nsChanged: e.target.checked } })}
              className="w-4 h-4 rounded border-zinc-300 accent-blue-600"
            />
            <span className="text-sm">Ho cambiato i nameserver</span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={reverify}
            disabled={reverifying}
            className="px-4 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-40 transition-colors"
          >
            {reverifying ? "Verifica in corso…" : "🔄 Re-verifica DNS"}
          </button>
          {cfPresent && (
            <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Zona trovata!
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => {
              onChange({ step2: { ...state.step2, skipped: true } });
              onNext();
            }}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
          >
            Skip per ora (attenzione: il deploy fallirà senza zona su CF)
          </button>
        </div>
      </div>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!canProceed}
      />
    </div>
  );
}
