export type AnthropicModel = "claude-opus-4-7" | "claude-sonnet-4-6" | "claude-haiku-4-5-20251001";

type AnthropicMessage = { role: "user" | "assistant"; content: string };

type AnthropicSystemBlock = { type: "text"; text: string; cache_control?: { type: "ephemeral" } };

export type AnthropicCallArgs = {
  apiKey: string;
  model: AnthropicModel;
  systemBlocks: AnthropicSystemBlock[];
  messages: AnthropicMessage[];
  maxTokens?: number;
  temperature?: number;
  fetcher?: typeof fetch;
};

export type AnthropicCallResult = {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
  };
  stopReason: string | null;
};

export async function callAnthropic(args: AnthropicCallArgs): Promise<AnthropicCallResult> {
  const fetcher = args.fetcher ?? fetch;
  const res = await fetcher("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": args.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: args.maxTokens ?? 8000,
      // `temperature` is deprecated on Opus 4.7+ — omit unless an explicit
      // non-default value is passed.
      ...(args.temperature !== undefined && { temperature: args.temperature }),
      system: args.systemBlocks,
      messages: args.messages.map((m) => ({
        role: m.role,
        content: [{ type: "text", text: m.content }],
      })),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 500)}`);
  }
  const json = (await res.json()) as {
    content: { type: string; text?: string }[];
    usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
    stop_reason: string | null;
  };
  const text = (json.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text!)
    .join("\n");
  return {
    text,
    usage: {
      inputTokens: json.usage.input_tokens,
      outputTokens: json.usage.output_tokens,
      cacheReadInputTokens: json.usage.cache_read_input_tokens ?? 0,
      cacheCreationInputTokens: json.usage.cache_creation_input_tokens ?? 0,
    },
    stopReason: json.stop_reason ?? null,
  };
}
