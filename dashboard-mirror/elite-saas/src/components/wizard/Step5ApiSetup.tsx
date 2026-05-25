"use client";

import { WizardState } from "@/lib/wizard-types";
import { SECRETS, SecretSpec } from "@/lib/secrets-config";
import { SecretEditor } from "@/components/SecretEditor";
import { StepNav } from "./StepNav";

interface Props {
  state: WizardState;
  secretStatuses: Record<string, "set" | "missing" | "placeholder">;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  set: "bg-emerald-500",
  placeholder: "bg-amber-500",
  missing: "bg-red-500",
};

const STATUS_LABEL: Record<string, string> = {
  set: "configurato",
  placeholder: "placeholder",
  missing: "mancante",
};

function getRelevantSecrets(scenario: string | null): SecretSpec[] {
  // Always include plan-a secrets
  const phases: string[] = ["plan-a"];
  if (scenario === "plan-b" || scenario === "plan-c") phases.push("plan-b");
  if (scenario === "plan-c") phases.push("plan-c");
  return SECRETS.filter((s) => phases.includes(s.required_for_phase));
}

export function Step5ApiSetup({ state, secretStatuses, onChange, onNext, onBack }: Props) {
  const relevant = getRelevantSecrets(state.step3.scenario);
  const setCount = relevant.filter((s) => (secretStatuses[s.name] ?? "missing") === "set").length;
  const criticalMissing = (secretStatuses["CLOUDFLARE_API_TOKEN"] ?? "missing") !== "set";

  const seoWillBeDisabled =
    (secretStatuses["ANTHROPIC_API_KEY"] ?? "missing") !== "set" ||
    (secretStatuses["DATAFORSEO_LOGIN"] ?? "missing") !== "set";

  return (
    <div>
      <h1 className="text-2xl font-semibold">Configurazione API</h1>
      <p className="text-zinc-500 mt-1 mb-2 text-sm">
        Per procedere serve <strong>solo</strong> il <code className="font-mono">CLOUDFLARE_API_TOKEN</code>.
        Gli altri sono opzionali ora ma servono prima di andare in produzione.
      </p>

      <details className="mb-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium select-none">
          Come creare il token Cloudflare (1 minuto)
        </summary>
        <div className="mt-3 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
          <ol className="list-decimal list-inside space-y-1.5">
            <li>
              Apri{" "}
              <a
                href="https://dash.cloudflare.com/profile/api-tokens"
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline"
              >
                dash.cloudflare.com/profile/api-tokens ↗
              </a>{" "}
              → <em>Create Token</em> → <em>Create Custom Token</em>.
            </li>
            <li>
              <strong>Token name</strong>: <code className="font-mono">Elite Pipeline Dashboard</code> (un solo token, vale per tutti i siti).
            </li>
            <li>
              <strong>Permissions</strong> — aggiungi le righe qui sotto. Le prime 2 sono obbligatorie, le altre 4 servono in seguito (mettile ora per non rifare il token):
            </li>
          </ol>
          <div className="border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <tr>
                  <th className="px-2 py-1.5 text-left">Type</th>
                  <th className="px-2 py-1.5 text-left">Resource</th>
                  <th className="px-2 py-1.5 text-left">Level</th>
                  <th className="px-2 py-1.5 text-left">Quando</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-2 py-1.5">Account</td><td className="px-2 py-1.5">Workers Scripts</td><td className="px-2 py-1.5">Edit</td>
                  <td className="px-2 py-1.5 font-sans text-emerald-600 dark:text-emerald-400">obbligatorio</td>
                </tr>
                <tr className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-2 py-1.5">Zone</td><td className="px-2 py-1.5">Zone</td><td className="px-2 py-1.5">Read</td>
                  <td className="px-2 py-1.5 font-sans text-emerald-600 dark:text-emerald-400">obbligatorio</td>
                </tr>
                <tr className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-2 py-1.5">Account</td><td className="px-2 py-1.5">Cloudflare Pages</td><td className="px-2 py-1.5">Edit</td>
                  <td className="px-2 py-1.5 font-sans text-zinc-500">future-proof</td>
                </tr>
                <tr className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-2 py-1.5">Account</td><td className="px-2 py-1.5">Email Routing Addresses</td><td className="px-2 py-1.5">Edit</td>
                  <td className="px-2 py-1.5 font-sans text-zinc-500">future-proof</td>
                </tr>
                <tr className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-2 py-1.5">Account</td><td className="px-2 py-1.5">Account Settings</td><td className="px-2 py-1.5">Read</td>
                  <td className="px-2 py-1.5 font-sans text-zinc-500">future-proof</td>
                </tr>
                <tr className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-2 py-1.5">Zone</td><td className="px-2 py-1.5">DNS</td><td className="px-2 py-1.5">Edit</td>
                  <td className="px-2 py-1.5 font-sans text-zinc-500">future-proof</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ol className="list-decimal list-inside space-y-1.5" start={4}>
            <li><strong>Account Resources</strong>: Include → il tuo account.</li>
            <li><strong>Zone Resources</strong>: Include → All zones from an account → il tuo account.</li>
            <li>Salta TTL e IP filtering. <em>Continue to summary → Create Token</em>. Copia il token e incollalo qui sotto.</li>
          </ol>
          <p className="text-xs text-zinc-500 italic">
            Non automatizzabile: Cloudflare non espone OAuth pubblico per generare token via API.
          </p>
        </div>
      </details>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-2 bg-blue-500 rounded-full transition-all"
            style={{ width: `${relevant.length > 0 ? (setCount / relevant.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-zinc-500 whitespace-nowrap">
          {setCount}/{relevant.length} secret configurati
        </span>
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Secret</th>
              <th className="px-3 py-2 text-left hidden sm:table-cell">Descrizione</th>
              <th className="px-3 py-2 text-left">Azione</th>
            </tr>
          </thead>
          <tbody>
            {relevant.map((s) => {
              const status = secretStatuses[s.name] ?? "missing";
              return (
                <tr key={s.name} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLOR[status]}`} />
                      <span className="text-xs text-zinc-500 hidden sm:inline">{STATUS_LABEL[status]}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs">{s.name}</div>
                    {s.generation_url && (
                      <a
                        href={s.generation_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Genera ↗
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-500 hidden sm:table-cell">
                    {s.description}
                  </td>
                  <td className="px-3 py-2">
                    {status === "set" ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ set</span>
                    ) : (
                      <SecretEditor name={s.name} isSensitive={s.is_sensitive} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {seoWillBeDisabled && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-700 dark:text-amber-400 mb-4">
          ⚠ Continuando ora, le funzionalità SEO automatiche saranno disabilitate finché{" "}
          <code className="font-mono">ANTHROPIC_API_KEY</code> non sarà configurato.
        </div>
      )}

      <StepNav
        onBack={onBack}
        onNext={onNext}
        nextDisabled={criticalMissing}
        nextLabel={criticalMissing ? "Configura almeno CLOUDFLARE_API_TOKEN" : "Avanti →"}
      />
    </div>
  );
}
