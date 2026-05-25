"use client";

import { useState } from "react";
import { WizardState, Scenario } from "@/lib/wizard-types";
import { StepNav } from "./StepNav";

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const SCENARIOS: { id: Scenario; icon: string; title: string; description: string; hasRef?: boolean }[] = [
  {
    id: "plan-a",
    icon: "🔄",
    title: "A. Dominio scaduto da rivivere",
    description:
      "Ho comprato un dominio expired e voglio sfruttarne i backlink storici per costruire un sito nuovo.",
  },
  {
    id: "plan-b",
    icon: "✨",
    title: "B. Rebuild di sito esistente",
    description:
      "Ho un sito attivo (mio o di un cliente) che voglio ricostruire da zero con design moderno.",
  },
  {
    id: "plan-c",
    icon: "🎨",
    title: "C. Clone competitivo / inspirazione",
    description:
      "Ho un sito di riferimento che mi piace, voglio adattarlo al mio brand.",
    hasRef: true,
  },
];

export function Step3Scenario({ state, onChange, onNext, onBack }: Props) {
  const [refUrl, setRefUrl] = useState(state.step3.referenceUrl ?? "");

  function select(id: Scenario) {
    onChange({
      step3: {
        ...state.step3,
        scenario: id,
        referenceUrl: id === "plan-c" ? refUrl : "",
      },
    });
  }

  const canProceed = !!state.step3.scenario;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Che tipo di progetto è?</h1>
      <p className="text-zinc-500 mt-1 mb-6 text-sm">
        Seleziona lo scenario che descrive meglio il tuo caso.
      </p>

      <div className="space-y-3 max-w-lg">
        {SCENARIOS.map((s) => {
          const selected = state.step3.scenario === s.id;
          return (
            <div key={s.id}>
              <button
                onClick={() => select(s.id)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{s.icon}</span>
                  <div>
                    <div className={`text-sm font-semibold ${selected ? "text-blue-700 dark:text-blue-300" : ""}`}>
                      {s.title}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">{s.description}</div>
                  </div>
                </div>
              </button>

              {s.hasRef && selected && (
                <div className="ml-2 mt-2 pl-4 border-l-2 border-blue-300 dark:border-blue-800">
                  <label className="block text-xs text-zinc-500 mb-1">
                    URL del sito di riferimento (opzionale)
                  </label>
                  <input
                    type="url"
                    value={refUrl}
                    onChange={(e) => {
                      setRefUrl(e.target.value);
                      onChange({
                        step3: { ...state.step3, scenario: s.id, referenceUrl: e.target.value },
                      });
                    }}
                    placeholder="https://esempio.com"
                    className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!canProceed} />
    </div>
  );
}
