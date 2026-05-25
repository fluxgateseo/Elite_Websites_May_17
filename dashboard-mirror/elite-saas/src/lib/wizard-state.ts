import { WizardState, defaultWizardState } from "./wizard-types";

const STORAGE_KEY = "elite-wizard-draft-v1";

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function loadWizardState(): WizardState {
  if (typeof window === "undefined") return defaultWizardState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultWizardState();
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    // Merge with defaults to handle schema additions
    return { ...defaultWizardState(), ...parsed };
  } catch {
    return defaultWizardState();
  }
}

export function saveWizardState(state: WizardState): void {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage might be full or blocked
    }
  }, 500);
}

export function saveWizardStateImmediate(state: WizardState): void {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearWizardState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
