import { WizardContainer } from "@/components/wizard/WizardContainer";
import { getSecretStatuses } from "@/lib/secret-status";

export default async function NuovoSitoPage({ searchParams }: { searchParams: Promise<{ domain?: string }> }) {
  const { domain } = await searchParams;
  const secretStatuses = await getSecretStatuses();
  return <WizardContainer secretStatuses={secretStatuses} initialDomain={domain ?? null} />;
}
