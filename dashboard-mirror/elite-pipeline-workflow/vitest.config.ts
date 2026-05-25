import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { 
    environment: "node",
    alias: {
      "cloudflare:workers": new URL("./src/types.ts", import.meta.url).pathname,
    },
  },
});
