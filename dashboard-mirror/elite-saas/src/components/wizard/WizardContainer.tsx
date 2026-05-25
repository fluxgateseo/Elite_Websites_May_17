"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { WizardState, defaultWizardState } from "@/lib/wizard-types";
import { loadWizardState, saveWizardState, saveWizardStateImmediate } from "@/lib/wizard-state";
import { SECRETS } from "@/lib/secrets-config";

import { Step1Domain } from "./Step1Domain";
import { Step2DnsTransfer } from "./Step2DnsTransfer";
import { Step3Scenario } from "./Step3Scenario";
import { Step4Brief } from "./Step4Brief";
import { Step5ApiSetup } from "./Step5ApiSetup";
import { Step6SeoSource } from "./Step6SeoSource";
import { Step7Aesthetic } from "./Step7Aesthetic";
import { Step8Voice } from "./Step8Voice";
import { Step9Pages } from "./Step9Pages";
import { Step10Deployment } from "./Step10Deployment";
import { Step11Review } from "./Step11Review";

interface WizardContainerProps {
  secretStatuses: Record<string, "set" | "missing" | "placeholder">;
  initialDomain?: string | null;
}

const STEP_LABELS = [
  "Dominio",
  "DNS",
  "Scenario",
  "Brief",
  "API",
  "SEO",
  "Estetica",
  "Voce",
  "Pagine",
  "Deploy",
  "Riepilogo",
];

export function WizardContainer({ secretStatuses, initialDomain }: WizardContainerProps) {
  const [state, setState] = useState<WizardState>(defaultWizardState);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount. If we arrived from "Avvia build" with a
  // ?domain= (brief-missing guard), prefill it — but only when the saved
  // draft has no domain yet, so we never clobber an in-progress wizard.
  useEffect(() => {
    const saved = loadWizardState();
    if (initialDomain && !saved.step1.domain) {
      saved.step1 = { ...saved.step1, domain: initialDomain };
      saved.currentStep = 1;
    }
    setState(saved);
    setHydrated(true);
  }, [initialDomain]);

  // Save on every state change
  useEffect(() => {
    if (hydrated) {
      saveWizardState(state);
    }
  }, [state, hydrated]);

  const currentStep = state.currentStep;
  const cfPresent = state.step1.preflightResult?.cf_zone?.present;

  // Compute effective steps (Step 2 is skipped if CF zone already present)
  const showStep2 = !cfPresent;
  const totalSteps = showStep2 ? 11 : 10;

  // Map logical step (1-11) to display step index (handles skip)
  function stepToDisplayIndex(step: number): number {
    if (!showStep2 && step >= 2) return step - 1;
    return step;
  }

  function displayIndexToStep(idx: number): number {
    if (!showStep2 && idx >= 2) return idx + 1;
    return idx;
  }

  const currentDisplayIdx = stepToDisplayIndex(currentStep);

  function patch(partial: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  function goToStep(step: number) {
    setState((prev) => ({ ...prev, currentStep: step }));
  }

  function nextStep() {
    setState((prev) => {
      let next = prev.currentStep + 1;
      // Skip step 2 if CF zone already detected
      if (next === 2 && cfPresent) next = 3;
      return { ...prev, currentStep: Math.min(next, 11) };
    });
  }

  function prevStep() {
    setState((prev) => {
      let back = prev.currentStep - 1;
      // Skip step 2 backwards if CF zone already detected
      if (back === 2 && cfPresent) back = 1;
      return { ...prev, currentStep: Math.max(back, 1) };
    });
  }

  function saveDraft() {
    saveWizardStateImmediate(state);
    // Brief flash feedback — could be a toast, but keep it simple
    alert("Bozza salvata!");
  }

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400 text-sm">Caricamento…</div>
      </div>
    );
  }

  // Build effective step labels (skipping step 2 if CF present)
  const effectiveSteps = STEP_LABELS.filter((_, i) => {
    const stepNum = i + 1;
    if (stepNum === 2 && cfPresent) return false;
    return true;
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/sites" className="hover:text-zinc-800 dark:hover:text-zinc-200">Siti</Link>
          <span>/</span>
          <span className="text-zinc-800 dark:text-zinc-200 font-medium">Nuovo Sito</span>
        </div>
        <button
          onClick={saveDraft}
          className="text-xs px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-500 transition-colors"
        >
          Salva bozza
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex gap-1 mb-2">
          {effectiveSteps.map((label, idx) => {
            const stepNum = displayIndexToStep(idx + 1);
            const isDone = stepNum < currentStep;
            const isCurrent = stepNum === currentStep || (currentStep === 2 && cfPresent && stepNum === 3 && idx === 1);
            return (
              <div
                key={label}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  isDone
                    ? "bg-blue-500"
                    : isCurrent
                    ? "bg-blue-400"
                    : "bg-zinc-200 dark:bg-zinc-800"
                }`}
                title={label}
              />
            );
          })}
        </div>
        <div className="text-xs text-zinc-400">
          Step {currentDisplayIdx} di {totalSteps} — {STEP_LABELS[currentStep - 1]}
        </div>
      </div>

      <div className="flex gap-6 flex-1">
        {/* Left sidebar step list */}
        <div className="hidden lg:flex flex-col gap-1 w-40 flex-shrink-0">
          {effectiveSteps.map((label, idx) => {
            const stepNum = displayIndexToStep(idx + 1);
            const isDone = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            return (
              <button
                key={label}
                onClick={() => stepNum < currentStep && goToStep(stepNum)}
                disabled={stepNum > currentStep}
                className={`text-left text-xs px-2 py-1.5 rounded transition-colors ${
                  isCurrent
                    ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold"
                    : isDone
                    ? "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                    : "text-zinc-400 cursor-not-allowed"
                }`}
              >
                <span className="mr-1.5">
                  {isDone ? "✓" : isCurrent ? "→" : String(idx + 1).padStart(2, "0")}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        {/* Main step content */}
        <div className="flex-1 min-w-0">
          {currentStep === 1 && (
            <Step1Domain state={state} onChange={patch} onNext={nextStep} />
          )}
          {currentStep === 2 && !cfPresent && (
            <Step2DnsTransfer state={state} onChange={patch} onNext={nextStep} onBack={prevStep} />
          )}
          {currentStep === 3 && (
            <Step3Scenario state={state} onChange={patch} onNext={nextStep} onBack={prevStep} />
          )}
          {currentStep === 4 && (
            <Step4Brief state={state} onChange={patch} onNext={nextStep} onBack={prevStep} />
          )}
          {currentStep === 5 && (
            <Step5ApiSetup
              state={state}
              secretStatuses={secretStatuses}
              onChange={patch}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 6 && (
            <Step6SeoSource
              state={state}
              secretStatuses={secretStatuses}
              onChange={patch}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 7 && (
            <Step7Aesthetic state={state} onChange={patch} onNext={nextStep} onBack={prevStep} />
          )}
          {currentStep === 8 && (
            <Step8Voice state={state} onChange={patch} onNext={nextStep} onBack={prevStep} />
          )}
          {currentStep === 9 && (
            <Step9Pages state={state} onChange={patch} onNext={nextStep} onBack={prevStep} />
          )}
          {currentStep === 10 && (
            <Step10Deployment state={state} onChange={patch} onNext={nextStep} onBack={prevStep} />
          )}
          {currentStep === 11 && (
            <Step11Review state={state} onBack={prevStep} onGoToStep={goToStep} />
          )}
        </div>
      </div>
    </div>
  );
}
