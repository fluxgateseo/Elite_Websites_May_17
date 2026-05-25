import Link from "next/link";
import { makeT, type Lang } from "@/lib/i18n";

const NAV = [
  { href: "/sites", key: "nav.sites" },
  { href: "/nuovo-sito", key: "nav.newSite" },
  { href: "/builds", key: "nav.builds" },
  { href: "/lead-inbox", key: "nav.leadInbox" },
  { href: "/settings", key: "nav.settings" },
] as const;

export function Sidebar({ lang }: { lang: Lang }) {
  const t = makeT(lang);
  return (
    <nav className="w-60 border-r border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-1">
      <div className="text-sm font-semibold text-zinc-500 px-2 py-2">{t("nav.brand")}</div>
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="px-2 py-1.5 rounded text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
}
