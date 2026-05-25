import { describe, it, expect } from "vitest";
import worker from "../src/index";

const env = {
  PIPELINE: {
    async create() { return { id: "fake-id", status: async () => ({ status: "queued" }) }; },
    async get() { return { status: async () => ({ status: "running" }) }; },
  },
  PIPELINE_SHARED_SECRET: "test-secret",
} as unknown as Parameters<typeof worker.fetch>[1];

describe("elite-pipeline-workflow worker", () => {
  it("/health returns ok payload", async () => {
    const req = new Request("https://test.workers.dev/health");
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
  });

  it("/trigger requires shared secret", async () => {
    const req = new Request("https://test.workers.dev/trigger", {
      method: "POST",
      body: JSON.stringify({ domain: "test.it", briefId: "abc", jobId: "j1" }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(401);
  });

  it("/trigger creates a workflow instance with correct secret", async () => {
    const req = new Request("https://test.workers.dev/trigger", {
      method: "POST",
      headers: { "x-pipeline-secret": "test-secret" },
      body: JSON.stringify({ domain: "test.it", briefId: "abc", jobId: "j1" }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const body = await res.json() as { id: string; status: { status: string } };
    expect(body.id).toBe("fake-id");
  });

  it("/trigger rejects payload missing required fields", async () => {
    const req = new Request("https://test.workers.dev/trigger", {
      method: "POST",
      headers: { "x-pipeline-secret": "test-secret" },
      body: JSON.stringify({ domain: "test.it" }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it("/status/:id returns instance status", async () => {
    const req = new Request("https://test.workers.dev/status/abc-123", {
      headers: { "x-pipeline-secret": "test-secret" },
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const body = await res.json() as { id: string };
    expect(body.id).toBe("abc-123");
  });
});
