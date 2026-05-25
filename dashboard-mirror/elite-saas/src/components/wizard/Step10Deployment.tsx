"use client";

import { WizardState, ApprovalMode } from "@/lib/wizard-types";
import { StepNav } from "./StepNav";

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step10Deployment({ state, onChange, onNext, onBack }: Props) {
  const s = state.step10;
  const domain = state.step1.domain;

  function patch(fields: Partial<typeof s>) {
    onChange({ step10: { ...s, ...fields } });
  }

  const checkboxCls = "w-4 h-4 rounded border-zinc-300 accent-blue-600";

  const APPROVAL_OPTIONS: { id: ApprovalMode; label: string; note?: string }[] = [
    {
      id: "manual",
      label: "Manual — pausa su Strategy + Content per review",
    },
    {
      id: "auto",
      label: "Auto — full pipeline senza interruzioni",
      note: "Consigliato solo dopo aver validato pipeline su sito sandbox",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Deploy e configurazioni finali</h1>
      <p className="text-zinc-500 mt-1 mb-6 text-sm">
        Configura come verrà deployato il sito.
      </p>

      <div className="max-w-lg space-y-6">
        {/* Hostname */}
        <div>
          <label className="block text-sm font-semibold mb-2">Hostname target</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="hostname"
                checked={!s.hostnameWithWww}
                onChange={() => patch({ hostnameWithWww: false })}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm font-mono">{domain || "dominio.it"}</span>
              <span className="text-xs text-zinc-400">(root — consigliato)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="hostname"
                checked={s.hostnameWithWww}
                onChange={() => patch({ hostnameWithWww: true })}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm font-mono">www.{domain || "dominio.it"}</span>
            </label>
          </div>
        </div>

        {/* Email routing */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Email routing</h2>
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={s.emailRouting}
                onChange={(e) => patch({ emailRouting: e.target.checked })}
                className={`${checkboxCls} mt-0.5`}
              />
              <div>
                <div className="text-sm">
                  Configura <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                    info@{domain || "dominio.it"}
                  </code> → forward ad{" "}
                  <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                    AGENCY_EMAIL
                  </code>
                </div>
              </div>
            </label>

            {s.emailRouting && (
              <label className="flex items-start gap-3 cursor-pointer ml-7">
                <input
                  type="checkbox"
                  checked={s.catchAllEmail}
                  onChange={(e) => patch({ catchAllEmail: e.target.checked })}
                  className={`${checkboxCls} mt-0.5`}
                />
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Catch-all: cattura anche typo (es. infpo@, info1@) → stesso forward
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Other options */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Opzioni</h2>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={s.autoDeploy}
                onChange={(e) => patch({ autoDeploy: e.target.checked })}
                className={`${checkboxCls} mt-0.5`}
              />
              <div>
                <div className="text-sm">Auto-deploy su git push</div>
                <div className="text-xs text-zinc-400">Cloudflare Pages deploya automaticamente ad ogni push</div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={s.gdprBanner}
                onChange={(e) => patch({ gdprBanner: e.target.checked })}
                className={`${checkboxCls} mt-0.5`}
              />
              <div>
                <div className="text-sm">Cookie banner GDPR</div>
                <div className="text-xs text-zinc-400">
                  Aggiungiamo solo se attivi analytics
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Approval mode */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Modalità approvazione pipeline</h2>
          <div className="space-y-2">
            {APPROVAL_OPTIONS.map((opt) => (
              <label key={opt.id} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="approvalMode"
                  value={opt.id}
                  checked={s.approvalMode === opt.id}
                  onChange={() => patch({ approvalMode: opt.id })}
                  className="w-4 h-4 accent-blue-600 mt-0.5"
                />
                <div>
                  <div className="text-sm">{opt.label}</div>
                  {opt.note && (
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠ {opt.note}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextLabel="Avanti → Riepilogo" />
    </div>
  );
}
