import { Sidebar } from "./Sidebar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { makeT, type Lang } from "@/lib/i18n";

interface UserSummary {
  email: string;
  role: "admin" | "member" | "free";
}

export function LayoutShell({
  children,
  user,
  lang,
}: {
  children: React.ReactNode;
  user: UserSummary | null;
  lang: Lang;
}) {
  const t = makeT(lang);
  return (
    <div className="flex h-screen">
      <Sidebar lang={lang} />
      <div className="flex-1 flex flex-col">
        <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 text-xs text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span>{t("shell.loggedInAs")} <span className="font-mono">{user.email}</span></span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] uppercase tracking-wide font-medium">{user.role}</span>
              </>
            ) : (
              <span>{t("shell.notAuth")}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher current={lang} variant="inline" />
            {user && (
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline">
                  {t("shell.logout")}
                </button>
              </form>
            )}
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
