"use client";

import { WizardState, LeadCapture } from "@/lib/wizard-types";
import { StepNav } from "./StepNav";

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const LEAD_OPTIONS: { id: LeadCapture; label: string }[] = [
  { id: "form", label: "Solo form contatti" },
  { id: "phone", label: "Solo telefono + WhatsApp button" },
  { id: "both", label: "Entrambi (consigliato)" },
];

const BLOG_ARTICLES: (0 | 5 | 10 | 20)[] = [0, 5, 10, 20];

export function Step9Pages({ state, onChange, onNext, onBack }: Props) {
  const s = state.step9;
  const isRistorazione = state.step4.industry === "Ristorazione";

  function patch(fields: Partial<typeof s>) {
    onChange({ step9: { ...s, ...fields } });
  }

  function togglePage(key: keyof typeof s.pages, value?: boolean) {
    patch({ pages: { ...s.pages, [key]: value !== undefined ? value : !s.pages[key as keyof typeof s.pages] } });
  }

  const checkboxCls = "w-4 h-4 rounded border-zinc-300 accent-blue-600";

  const PAGE_LIST: { key: keyof typeof s.pages; label: string; always?: boolean }[] = [
    { key: "home", label: "Home", always: true },
    { key: "chiSiamo", label: "Chi Siamo", always: true },
    { key: "serviziMenu", label: isRistorazione ? "Menu" : "Servizi" },
    { key: "galleria", label: "Galleria" },
    { key: "eventi", label: "Eventi" },
    { key: "blog", label: "Blog" },
    { key: "faq", label: "FAQ" },
    { key: "contatti", label: "Contatti", always: true },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Quali pagine servono?</h1>
      <p className="text-zinc-500 mt-1 mb-6 text-sm">
        Seleziona le pagine da includere nel sito.
      </p>

      <div className="max-w-lg space-y-6">
        {/* Pages */}
        <div className="space-y-2">
          {PAGE_LIST.map(({ key, label, always }) => {
            if (key === "blogArticoli") return null;
            const checked = !!s.pages[key as keyof typeof s.pages];
            return (
              <div key={key}>
                <label className="flex items-center gap-3 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={checked as boolean}
                    disabled={always}
                    onChange={() => togglePage(key)}
                    className={checkboxCls}
                  />
                  <span className={`text-sm ${always ? "text-zinc-500" : ""}`}>
                    {label}
                    {always && <span className="ml-1 text-xs text-zinc-400">(sempre incluso)</span>}
                  </span>
                </label>

                {/* Blog article count */}
                {key === "blog" && checked && (
                  <div className="ml-7 flex items-center gap-2 pb-1">
                    <span className="text-xs text-zinc-500">Articoli iniziali:</span>
                    {BLOG_ARTICLES.map((n) => (
                      <button
                        key={n}
                        onClick={() => patch({ pages: { ...s.pages, blogArticoli: n } })}
                        className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                          s.pages.blogArticoli === n
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-500"
                        }`}
                      >
                        {n === 0 ? "Nessuno" : n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Lead capture */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Acquisizione lead</h2>
          <div className="space-y-2">
            {LEAD_OPTIONS.map((opt) => (
              <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="leadCapture"
                  value={opt.id}
                  checked={s.leadCapture === opt.id}
                  onChange={() => patch({ leadCapture: opt.id })}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-semibold mb-1">Lingua del sito</label>
          <select
            className="text-sm px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={s.lingua}
            onChange={(e) => patch({ lingua: e.target.value })}
          >
            <option value="Italiano">Italiano</option>
            <option value="Italiano + English" disabled>
              Italiano + English (prossimamente)
            </option>
          </select>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}
