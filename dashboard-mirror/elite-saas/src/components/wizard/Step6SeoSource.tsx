"use client";

import { useState } from "react";
import { WizardState, SeoSource } from "@/lib/wizard-types";
import { StepNav } from "./StepNav";

interface Props {
  state: WizardState;
  secretStatuses: Record<string, "set" | "missing" | "placeholder">;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const OPTIONS: {
  id: SeoSource;
  title: string;
  description: string;
  note?: string;
  exclusive?: boolean;
}[] = [
  {
    id: "dataforseo",
    title: "DataForSEO automatico",
    description:
      "Useremo l'API di DataForSEO per estrarre backlinks, anchor text e keywords storiche del dominio.",
    note: "GRATIS se hai già la chiave API.",
  },
  {
    id: "csv",
    title: "Upload CSV da Ahrefs",
    description:
      "Esporta manualmente da Ahrefs UI (Site Explorer → Backlinks → Export → CSV) e carica qui.",
  },
  {
    id: "skip",
    title: "Skip SEO per ora",
    description:
      "Costruiamo solo basandoci sul brief. Nessuna analisi storica.",
    exclusive: true,
  },
];

export function Step6SeoSource({ state, secretStatuses, onChange, onNext, onBack }: Props) {
  const [fileName, setFileName] = useState(state.step6.csvFileName ?? "");
  const hasDataForSeo = (secretStatuses["DATAFORSEO_LOGIN"] ?? "missing") === "set";
  const sources = state.step6.sources;

  function toggle(id: SeoSource) {
    const current = state.step6.sources;
    const opt = OPTIONS.find((o) => o.id === id);

    let next: SeoSource[];
    if (opt?.exclusive) {
      next = current.includes(id) ? [] : [id];
    } else if (current.includes(id)) {
      next = current.filter((s) => s !== id);
    } else {
      next = [...current.filter((s) => !OPTIONS.find((o) => o.id === s)?.exclusive), id];
    }

    onChange({
      step6: {
        sources: next,
        csvFileName: next.includes("csv") ? fileName : undefined,
      },
    });
  }

  const skipSelected = sources.includes("skip");
  const csvSelected = sources.includes("csv");
  const dataforseoSelected = sources.includes("dataforseo");

  const canProceed =
    sources.length > 0 && (!csvSelected || !!fileName);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Da dove prendiamo i dati SEO?</h1>
      <p className="text-zinc-500 mt-1 mb-3 text-sm">
        Seleziona uno o più metodi (combinabili). &quot;Skip&quot; è esclusivo.
      </p>
      <div className="max-w-lg mb-6 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
        <strong>Consigliato: combina DataForSEO + Ahrefs CSV.</strong> Ahrefs ha la
        coda lunga di referring domains che DataForSEO spesso non trova; il merge
        produce un link map ~2× migliore per la strategia di Stage 2. Esporta da
        Ahrefs UI: Site Explorer → Referring domains → Export → CSV.
      </div>

      <div className="max-w-lg space-y-3">
        {OPTIONS.map((opt) => {
          const selected = sources.includes(opt.id);
          const disabledByDataforseo = opt.id === "dataforseo" && !hasDataForSeo;
          const disabledBySkip = !opt.exclusive && skipSelected;
          const isDisabled = disabledByDataforseo || disabledBySkip;
          return (
            <div key={opt.id}>
              <button
                type="button"
                onClick={() => !isDisabled && toggle(opt.id)}
                disabled={isDisabled}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : isDisabled
                    ? "border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 mt-0.5 ${
                      opt.exclusive
                        ? `w-4 h-4 rounded-full border-2 ${selected ? "border-blue-500 bg-blue-500" : "border-zinc-400"}`
                        : `w-4 h-4 rounded border-2 ${selected ? "border-blue-500 bg-blue-500" : "border-zinc-400"}`
                    }`}
                  >
                    {selected && (
                      <div className="w-full h-full flex items-center justify-center text-white text-[10px] leading-none">
                        {opt.exclusive ? "●" : "✓"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{opt.title}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{opt.description}</div>
                    {opt.note && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                        {opt.note}
                      </div>
                    )}
                    {disabledByDataforseo && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        Richiede DATAFORSEO_LOGIN configurato in Settings
                      </div>
                    )}
                    {disabledBySkip && (
                      <div className="text-xs text-zinc-500 mt-0.5">
                        Disabilitato perché &quot;Skip&quot; è selezionato
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {opt.id === "csv" && csvSelected && (
                <div className="ml-2 mt-2 pl-4 border-l-2 border-blue-300 dark:border-blue-800">
                  <label className="block text-xs text-zinc-500 mb-2">
                    File CSV da Ahrefs (max 10MB)
                  </label>
                  <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept=".csv"
                      id="csv-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            alert("File troppo grande (max 10MB)");
                            return;
                          }
                          setFileName(file.name);
                          onChange({
                            step6: { sources, csvFileName: file.name },
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor="csv-upload"
                      className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {fileName ? `✓ ${fileName}` : "Clicca per selezionare il CSV"}
                    </label>
                    <p className="text-xs text-zinc-400 mt-1">o trascina qui il file</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {dataforseoSelected && csvSelected && (
          <p className="text-xs text-blue-600 dark:text-blue-400 italic">
            Combinati: Stage 1 fa l&apos;estrazione DataForSEO + merge col CSV Ahrefs (priorità ai backlink unici).
          </p>
        )}
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!canProceed} />
    </div>
  );
}
