import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

export type DB = ReturnType<typeof drizzle<typeof schema>>;

export function getDb(): DB {
  const { env } = getCloudflareContext();
  // @ts-expect-error - D1 binding is added by wrangler.toml at runtime
  return drizzle(env.DB, { schema });
}
