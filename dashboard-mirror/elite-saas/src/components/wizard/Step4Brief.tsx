"use client";

import { WizardState, Industry } from "@/lib/wizard-types";
import { StepNav } from "./StepNav";

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const INDUSTRIES: Industry[] = [
  "Ristorazione",
  "Beauty/Wellness",
  "Tech/SaaS",
  "Servizi professionali",
  "E-commerce",
  "Turismo",
  "Salute",
  "Educazione",
  "Altro",
];

function Field({
  label,
  required,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {helper && <p className="text-xs text-zinc-400 mt-0.5">{helper}</p>}
    </div>
  );
}

const inputCls =
  "w-full text-sm px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

export function Step4Brief({ state, onChange, onNext, onBack }: Props) {
  const s = state.step4;

  function patch(fields: Partial<typeof s>) {
    onChange({ step4: { ...s, ...fields } });
  }

  const canProceed = !!s.businessName.trim() && !!s.industry && !!s.city.trim();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Parlaci del business</h1>
      <p className="text-zinc-500 mt-1 mb-6 text-sm">
        Inserisci le informazioni principali del sito. Potrai modificarle dopo.
      </p>

      <div className="max-w-lg space-y-5">
        <Field label="Nome del business" required>
          <input
            type="text"
            className={inputCls}
            value={s.businessName}
            onChange={(e) => patch({ businessName: e.target.value })}
            placeholder="Ristorante Angels"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Industria" required>
            <select
              className={inputCls}
              value={s.industry}
              onChange={(e) => patch({ industry: e.target.value as Industry })}
            >
              <option value="">— Seleziona —</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </Field>

          <Field label="Sotto-categoria" helper="es. Fine dining, Spa & massaggi">
            <input
              type="text"
              className={inputCls}
              value={s.subCategory}
              onChange={(e) => patch({ subCategory: e.target.value })}
              placeholder="Opzionale"
            />
          </Field>
        </div>

        <Field label="Città / Zona di attività" required>
          <input
            type="text"
            className={inputCls}
            value={s.city}
            onChange={(e) => patch({ city: e.target.value })}
            placeholder="Milano, zona Navigli"
          />
        </Field>

        <Field label="Indirizzo">
          <input
            type="text"
            className={inputCls}
            value={s.address}
            onChange={(e) => patch({ address: e.target.value })}
            placeholder="Via Garibaldi 42, 20123 Milano"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Telefono">
            <input
              type="tel"
              className={inputCls}
              value={s.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              placeholder="+39 02 1234567"
            />
          </Field>

          <Field
            label="Email"
            helper={`Lascia vuoto per usare info@${state.step1.domain || "dominio.it"}`}
          >
            <input
              type="email"
              className={inputCls}
              value={s.email}
              onChange={(e) => patch({ email: e.target.value })}
              placeholder="Opzionale"
            />
          </Field>
        </div>

        <Field
          label="Descrizione breve del business"
          helper={`${s.description.length}/500 caratteri`}
        >
          <textarea
            className={inputCls}
            rows={3}
            maxLength={500}
            value={s.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Breve descrizione di cosa fa il business, per chi è, cosa offre…"
          />
        </Field>

        <Field
          label="USP / Cosa vi distingue"
          helper={`${s.usp.length}/300 caratteri`}
        >
          <textarea
            className={inputCls}
            rows={2}
            maxLength={300}
            value={s.usp}
            onChange={(e) => patch({ usp: e.target.value })}
            placeholder="es. 'Unici a Milano con forno a legna del 1800', 'Consegna in 30 min garantita'…"
          />
        </Field>
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!canProceed} />
    </div>
  );
}
