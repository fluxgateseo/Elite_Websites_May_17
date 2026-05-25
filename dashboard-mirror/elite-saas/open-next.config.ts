import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal OpenNext config for Plan A.
// Caching overrides (KV incremental cache, D1 tag cache) can be added
// once real KV/D1 IDs are wired up in Tasks 5 & 6.
export default defineCloudflareConfig();
