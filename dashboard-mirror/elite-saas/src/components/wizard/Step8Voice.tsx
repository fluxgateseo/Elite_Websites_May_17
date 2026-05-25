"use client";

import { WizardState } from "@/lib/wizard-types";
import { StepNav } from "./StepNav";

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const TONE_LABELS = ["Molto formale", "Formale", "Neutro", "Casual", "Molto casual"];

const VOICE_TRAITS = [
  "Caldo", "Autorevole", "Giocoso", "Diretto", "Empatico",
  "Tecnico", "Ironico", "Premium", "Accessibile",
];

export function Step8Voice({ state, onChange, onNext, onBack }: Props) {
  const s = state.step8;

  function patch(fields: Partial<typeof s>) {
    onChange({ step8: { ...s, ...fields } });
  }

  function toggleTrait(trait: string) {
    const traits = s.voiceTraits.includes(trait)
      ? s.voiceTraits.filter((t) => t !== trait)
      : [...s.voiceTraits, trait];
    patch({ voiceTraits: traits });
  }

  const inputCls =
    "w-full text-sm px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      <h1 className="text-2xl font-semibold">Come parla il tuo brand?</h1>
      <p className="text-zinc-500 mt-1 mb-6 text-sm">
        Definiamo il tono e lo stile della voce del brand per i contenuti.
      </p>

      <div className="max-w-lg space-y-8">
        {/* Tone slider */}
        <div>
          <h2 className="text-sm font-semibold mb-3">
            Tono di voce — {TONE_LABELS[(s.toneFormal ?? 3) - 1]}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 whitespace-nowrap">Formale</span>
            <input
              type="range"
              min={1}
              max={5}
              value={s.toneFormal}
              onChange={(e) => patch({ toneFormal: Number(e.target.value) })}
              className="flex-1 accent-blue-600"
            />
            <span className="text-xs text-zinc-500 whitespace-nowrap">Casual</span>
          </div>
          <div className="flex justify-between mt-1">
            {TONE_LABELS.map((l, i) => (
              <div
                key={l}
                className={`text-xs w-1/5 text-center ${
                  s.toneFormal === i + 1 ? "text-blue-600 dark:text-blue-400 font-medium" : "text-zinc-400"
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Voice traits */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Tratti della voce</h2>
          <div className="flex flex-wrap gap-2">
            {VOICE_TRAITS.map((trait) => {
              const active = s.voiceTraits.includes(trait);
              return (
                <button
                  key={trait}
                  onClick={() => toggleTrait(trait)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    active
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {trait}
                </button>
              );
            })}
          </div>
        </div>

        {/* Avoid words */}
        <div>
          <label className="block text-sm font-semibold mb-1">Parole da evitare</label>
          <p className="text-xs text-zinc-400 mb-2">
            es. &quot;rivoluzionario&quot;, &quot;esclusivo&quot; — parole che non vuoi mai vedere nei contenuti
          </p>
          <textarea
            className={inputCls}
            rows={2}
            value={s.avoidWords}
            onChange={(e) => patch({ avoidWords: e.target.value })}
            placeholder="rivoluzionario, esclusivo, unico nel suo genere…"
          />
        </div>

        {/* Brand keywords */}
        <div>
          <label className="block text-sm font-semibold mb-1">Parole chiave del brand</label>
          <p className="text-xs text-zinc-400 mb-2">
            es. &quot;artigianale&quot;, &quot;tradizione&quot;, &quot;rooftop&quot; — termini che ricorrono spesso nei contenuti
          </p>
          <textarea
            className={inputCls}
            rows={2}
            value={s.brandKeywords}
            onChange={(e) => patch({ brandKeywords: e.target.value })}
            placeholder="artigianale, tradizione, autentico…"
          />
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}
