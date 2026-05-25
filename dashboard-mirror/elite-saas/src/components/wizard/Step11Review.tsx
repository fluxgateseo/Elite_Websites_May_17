"use client";

import { useState } from "react";
import { WizardState } from "@/lib/wizard-types";
import { clearWizardState } from "@/lib/wizard-state";
import { useRouter } from "next/navigation";

interface Props {
  state: WizardState;
  onBack: () => void;
  onGoToStep: (step: number) => void;
}

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900">
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-sm font-semibold text-left flex-1 hover:text-blue-600 dark:hover:text-blue-400"
        >
          {open ? "▾" : "▸"} {title}
        </button>
        <button
          onClick={() => onEdit(step)}
          className="text-xs text-blue-500 hover:underline ml-4"
        >
          Edit
        </button>
      </div>
      {open && (
        <div className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | boolean | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex gap-2">
      <span className="text-zinc-500 min-w-[120px] flex-shrink-0">{label}:</span>
      <span className="font-medium">{String(value)}</span>
    </div>
  );
}

export function Step11Review({ state, onBack, onGoToStep }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/wizard/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const data = await res.json() as { ok: boolean; domain?: string; error?: string };
      if (data.ok) {
        clearWizardState();
        setSubmitted(true);
        setTimeout(() => {
          router.push("/sites");
        }, 3000);
      } else {
        setError(data.error ?? "Errore sconosciuto");
      }
    } catch {
      setError("Errore di rete — riprova.");
    } finally {
      setSubmitting(false);
    }
  }

  const scenarioMap: Record<string, string> = {
    "plan-a": "A. Dominio scaduto da rivivere",
    "plan-b": "B. Rebuild di sito esistente",
    "plan-c": "C. Clone competitivo / inspirazione",
  };
  const scenarioLabel = state.step3.scenario ? (scenarioMap[state.step3.scenario] ?? "—") : "—";

  const pages = state.step9.pages;
  const selectedPages = [
    pages.home && "Home",
    pages.chiSiamo && "Chi Siamo",
    pages.serviziMenu && (state.step4.industry === "Ristorazione" ? "Menu" : "Servizi"),
    pages.galleria && "Galleria",
    pages.eventi && "Eventi",
    pages.blog && `Blog (${pages.blogArticoli} articoli)`,
    pages.faq && "FAQ",
    pages.contatti && "Contatti",
  ].filter(Boolean).join(", ");

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="text-4xl">🚀</div>
        <h1 className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">Brief salvato!</h1>
        <p className="text-zinc-500 text-sm">
          Dominio: <strong>{state.step1.domain}</strong>
        </p>
        <p className="text-zinc-500 text-sm">Redirect a /sites tra 3 secondi…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Riepilogo</h1>
      <p className="text-zinc-500 mt-1 mb-6 text-sm">
        Verifica tutti i dati prima di generare il sito.
      </p>

      <div className="space-y-3 mb-6">
        <Section title="Step 1 — Dominio" step={1} onEdit={onGoToStep}>
          <Row label="Dominio" value={state.step1.domain} />
          <Row label="Registrar" value={state.step1.preflightResult?.whois?.registrar} />
          <Row label="Scade il" value={state.step1.preflightResult?.whois?.registered_until
            ? new Date(state.step1.preflightResult.whois.registered_until).toLocaleDateString("it-IT")
            : undefined} />
          <Row label="Zona CF" value={state.step1.preflightResult?.cf_zone?.present ? "Presente" : "Non trovata"} />
        </Section>

        <Section title="Step 3 — Scenario" step={3} onEdit={onGoToStep}>
          <Row label="Scenario" value={scenarioLabel} />
          {state.step3.referenceUrl && <Row label="Riferimento" value={state.step3.referenceUrl} />}
        </Section>

        <Section title="Step 4 — Brief cliente" step={4} onEdit={onGoToStep}>
          <Row label="Business" value={state.step4.businessName} />
          <Row label="Industria" value={state.step4.industry} />
          <Row label="Sotto-cat." value={state.step4.subCategory} />
          <Row label="Città" value={state.step4.city} />
          <Row label="Indirizzo" value={state.step4.address} />
          <Row label="Telefono" value={state.step4.phone} />
          <Row label="Email" value={state.step4.email || `info@${state.step1.domain}`} />
          {state.step4.description && <Row label="Descrizione" value={state.step4.description} />}
          {state.step4.usp && <Row label="USP" value={state.step4.usp} />}
        </Section>

        <Section title="Step 6 — Sorgente SEO" step={6} onEdit={onGoToStep}>
          <Row
            label="Fonte dati"
            value={
              state.step6.sources.length === 0
                ? "—"
                : state.step6.sources
                    .map(
                      (s) =>
                        ({ dataforseo: "DataForSEO", csv: "CSV Ahrefs", skip: "Skip" }[s]),
                    )
                    .join(" + ")
            }
          />
          {state.step6.csvFileName && <Row label="File CSV" value={state.step6.csvFileName} />}
        </Section>

        <Section title="Step 7 — Estetica" step={7} onEdit={onGoToStep}>
          <Row label="Stile" value={state.step7.designStyle} />
          <Row label="Palette" value={state.step7.palette} />
          <Row label="Font" value={state.step7.fontPairing} />
          {state.step7.references && <Row label="Riferimenti" value={state.step7.references} />}
        </Section>

        <Section title="Step 8 — Voce brand" step={8} onEdit={onGoToStep}>
          <Row label="Tono" value={["Molto formale", "Formale", "Neutro", "Casual", "Molto casual"][state.step8.toneFormal - 1]} />
          <Row label="Tratti" value={state.step8.voiceTraits.join(", ") || "—"} />
          {state.step8.avoidWords && <Row label="Evitare" value={state.step8.avoidWords} />}
          {state.step8.brandKeywords && <Row label="Keywords" value={state.step8.brandKeywords} />}
        </Section>

        <Section title="Step 9 — Pagine" step={9} onEdit={onGoToStep}>
          <Row label="Pagine" value={selectedPages} />
          <Row label="Lead capture" value={{ form: "Solo form", phone: "Solo telefono + WA", both: "Entrambi" }[state.step9.leadCapture]} />
          <Row label="Lingua" value={state.step9.lingua} />
        </Section>

        <Section title="Step 10 — Deploy" step={10} onEdit={onGoToStep}>
          <Row
            label="Hostname"
            value={state.step10.hostnameWithWww ? `www.${state.step1.domain}` : state.step1.domain}
          />
          <Row label="Email routing" value={state.step10.emailRouting ? "Attivo" : "No"} />
          <Row label="Catch-all" value={state.step10.catchAllEmail ? "Attivo" : "No"} />
          <Row label="GDPR banner" value={state.step10.gdprBanner ? "Sì" : "No"} />
          <Row label="Approvazione" value={state.step10.approvalMode === "manual" ? "Manuale" : "Automatica"} />
        </Section>
      </div>

      {/* Cost/time estimate */}
      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-4 py-3 mb-6 text-xs text-zinc-500 space-y-1">
        <div>Stima costi: ~€0.05 (Claude) + €0.02 (DataForSEO) + €0.00 (Freepik free tier)</div>
        <div>Stima tempo: ~5-8 min pipeline + tempo tue approvazioni</div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3 mb-4 text-sm text-red-700 dark:text-red-400">
          ⚠ {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          ← Indietro
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-8 py-3 text-base rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold shadow-lg"
        >
          {submitting ? "Salvataggio…" : "🚀 Genera Sito"}
        </button>
      </div>
    </div>
  );
}
