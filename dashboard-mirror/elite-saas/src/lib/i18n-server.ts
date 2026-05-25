import "server-only";
import { cookies } from "next/headers";
import type { Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  const c = await cookies();
  const v = c.get("lang")?.value;
  return v === "en" ? "en" : "it";
}
