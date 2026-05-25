"use client";

import { useState, useCallback } from "react";
import { WizardState, PreflightResult } from "@/lib/wizard-types";
import { inferAccountFromDomain } from "@/lib/cf-account";
import { StepNav } from "./StepNav";

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
}

function isValidDomain(value: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(value.trim());
}

export function Step1Domain({ state, onChange, onNext }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [domainInput, setDomainInput] = useState(state.step1.domain);

  const preflight = useCallback(async (domain: string) => {
    if (!isValidDomain(domain)) {
      setError("Inserisci un dominio valido (es. ristoranteangels.it)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/wizard/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim().toLowerCase() }),
      });
      const data = await res.json() as PreflightResult;
      if (data.error) {
        setError(data.error);
        onChange({ step1: { ...state.step1, domain: domain.trim().toLowerCase(), preflightDone: false } });
      } else {
        onChange({
          step1: {
            domain: domain.trim().toLowerCase(),
            preflightDone: true,
            preflightResult: data,
          },
        });
      }
    } catch {
      setError("Errore di rete — riprova.");
    } finally {
      setLoading(false);
    }
  }, [state.step1, onChange]);

  const pf = state.step1.preflightResult;
  const cfPresent = pf?.cf_zone?.present;
  const whoisOk = !!pf?.whois;
  const inference = state.step1.domain ? inferAccountFromDomain(state.step1.domain) : null;
  const ambiguous = inference === "AMBIGUOUS";
  const accountResolved = !ambiguous || !!state.step1.account;
  const canProceed =
    state.step1.preflightDone && whoisOk && !!state.step1.domain && accountResolved;

  const setAccount = (acc: "IT" | "EN") => {
    onChange({ step1: { ...state.step1, account: acc } });
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Nuovo Sito</h1>
      <p className="text-zinc-500 mt-1 mb-6 text-sm">
        Costruiamo insieme il tuo sito. Iniziamo dal dominio.
      </p>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">
            Dominio <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={domainInput}
              onChange={(e) => {
                setDomainInput(e.target.value);
                setError("");
              }}
              onBlur={() => {
                if (domainInput && isValidDomain(domainInput)) {
                  preflight(domainInput);
                }
              }}
              placeholder="ristoranteangels.it"
              className="flex-1 text-sm px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") preflight(domainInput);
              }}
            />
            <button
              onClick={() => preflight(domainInput)}
              disabled={loading || !domainInput}
              className="px-4 py-2 text-sm rounded bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Verifica…" : "Verifica"}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-1">⚠ {error}</p>}
          <p className="text-xs text-zinc-400 mt-1">
            Solo il dominio, senza http:// o www (es. miosito.it)
          </p>
        </div>

        {pf && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50 dark:bg-zinc-900/50">
            <h3 className="text-sm font-medium">Risultati verifica</h3>

            {/* WHOIS */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${whoisOk ? "bg-emerald-500" : "bg-red-500"}`} />
                <span className="text-xs font-medium">WHOIS</span>
              </div>
              {pf.whois && (
                <div className="ml-4 text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                  {pf.whois.registrar && <div>Registrar: {pf.whois.registrar}</div>}
                  {pf.whois.registered_until && (
                    <div>
                      Scade il: {new Date(pf.whois.registered_until).toLocaleDateString("it-IT")}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Nameservers */}
            {pf.ns && pf.ns.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium">Nameserver</span>
                </div>
                <div className="ml-4 text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                  {pf.ns.map((ns) => (
                    <div key={ns} className={ns.toLowerCase().includes("cloudflare") ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>
                      {ns}
                      {ns.toLowerCase().includes("cloudflare") && " ✓ Cloudflare"}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CF Zone */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${cfPresent ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className="text-xs font-medium">Zona Cloudflare</span>
              </div>
              <div className="ml-4 text-xs text-zinc-600 dark:text-zinc-400">
                {cfPresent
                  ? `Presente su account ${pf.cf_zone?.account ?? "?"} (status: ${pf.cf_zone?.status ?? "—"})`
                  : "Non trovata sull'account Cloudflare attinente al TLD"}
              </div>
            </div>
          </div>
        )}

        {ambiguous && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
            <h3 className="text-sm font-medium text-amber-900 dark:text-amber-200">
              TLD ambiguo — scegli l'account Cloudflare
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Il dominio finisce in <code className="font-mono">.{state.step1.domain.split(".").slice(-1)[0]}</code>:
              non è chiaro se va sull'account italiano (Brianzadigitale, per siti in italiano)
              o inglese (fluxgateseo, per siti in inglese). Scegli sotto.
            </p>
            <div className="flex gap-2 pt-1">
              {(["IT", "EN"] as const).map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => setAccount(acc)}
                  className={
                    "px-3 py-1.5 text-xs rounded border transition-colors " +
                    (state.step1.account === acc
                      ? "border-amber-500 bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-medium"
                      : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800")
                  }
                >
                  {acc} — {acc === "IT" ? "italiano (Brianzadigitale)" : "inglese (fluxgateseo)"}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-400">
          Sicuro che sia tuo? Ti guideremo se serve trasferire DNS a Cloudflare.
        </p>
      </div>

      <StepNav
        showBack={false}
        onNext={onNext}
        nextDisabled={!canProceed}
      />
    </div>
  );
}
