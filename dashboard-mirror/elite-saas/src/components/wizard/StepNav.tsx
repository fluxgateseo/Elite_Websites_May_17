"use client";

interface StepNavProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  showBack?: boolean;
}

export function StepNav({
  onBack,
  onNext,
  nextLabel = "Avanti →",
  nextDisabled = false,
  backDisabled = false,
  showBack = true,
}: StepNavProps) {
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
      <div>
        {showBack && onBack && (
          <button
            onClick={onBack}
            disabled={backDisabled}
            className="px-4 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Indietro
          </button>
        )}
      </div>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="px-5 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {nextLabel}
      </button>
    </div>
  );
}
