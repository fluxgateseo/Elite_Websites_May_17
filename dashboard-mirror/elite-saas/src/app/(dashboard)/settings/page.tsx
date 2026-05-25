import { getCurrentUser } from "@/lib/auth";
import { SECRETS } from "@/lib/secrets-config";
import { getSecretStatuses } from "@/lib/secret-status";
import { SecretEditor } from "@/components/SecretEditor";
import { redirect } from "next/navigation";

const STATUS_COLOR: Record<string, string> = {
  set: "bg-emerald-500",
  placeholder: "bg-amber-500",
  missing: "bg-red-500",
};

const PHASE_LABEL: Record<string, string> = {
  "plan-a": "Plan A (Foundation)",
  "plan-b": "Plan B (Template + first site)",
  "plan-c": "Plan C (Pipeline CLI)",
  "plan-d": "Plan D (Dashboard wizard)",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin (illimitato)",
  member: "Member (5 siti, 50 build/mese)",
  free: "Free (1 dominio, 5 build/mese)",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const statuses = await getSecretStatuses();
  const rows = SECRETS.map((s) => ({ ...s, status: statuses[s.name] ?? "missing" }));
  const counts = {
    set: rows.filter((r) => r.status === "set").length,
    placeholder: rows.filter((r) => r.status === "placeholder").length,
    missing: rows.filter((r) => r.status === "missing").length,
  };

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-zinc-500 w-32">Email:</dt>
            <dd className="font-mono">{user.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-zinc-500 w-32">Ruolo:</dt>
            <dd>
              <span className="font-mono uppercase mr-2">{user.role}</span>
              <span className="text-xs text-zinc-500">{ROLE_LABEL[user.role]}</span>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-zinc-500 w-32">Account creato:</dt>
            <dd className="font-mono">{new Date(user.createdAt).toLocaleDateString("it-IT")}</dd>
          </div>
          {user.displayName && (
            <div className="flex gap-2">
              <dt className="text-zinc-500 w-32">Nome:</dt>
              <dd>{user.displayName}</dd>
            </div>
          )}
        </dl>
      </section>

      {user.role === "admin" && (
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold">Secrets Status</h2>
            <div className="text-xs text-zinc-500 flex gap-3">
              <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />{counts.set} set</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />{counts.placeholder} placeholder</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />{counts.missing} missing</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mb-3">Visibile solo agli admin. Aggiorna i secret tramite il pulsante Update di ogni riga.</p>
          <table className="w-full text-sm border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Secret</th>
                <th className="px-3 py-2">Required for</th>
                <th className="px-3 py-2">Bindings</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2"><span className={`inline-block w-2 h-2 rounded-full ${STATUS_COLOR[r.status]}`} title={r.status} /></td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.name}
                    {r.generation_url && (
                      <a href={r.generation_url} target="_blank" rel="noreferrer" className="ml-2 text-blue-500 hover:underline text-xs">generate &#8599;</a>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">{PHASE_LABEL[r.required_for_phase]}</td>
                  <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">{r.bindings.join(", ")}</td>
                  <td className="px-3 py-2">
                    {r.status === "set" ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">&#10003; set</span>
                    ) : (
                      <SecretEditor name={r.name} isSensitive={r.is_sensitive} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
