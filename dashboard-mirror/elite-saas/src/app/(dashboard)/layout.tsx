import { LayoutShell } from "@/components/LayoutShell";
import { getCurrentUser } from "@/lib/auth";
import { getLang } from "@/lib/i18n-server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const lang = await getLang();
  const userSummary = user ? { email: user.email, role: user.role } : null;
  return <LayoutShell user={userSummary} lang={lang}>{children}</LayoutShell>;
}
