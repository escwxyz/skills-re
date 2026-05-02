/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { createGeminiChat, createWorkersAiChat } from "@cloudflare/tanstack-ai";
import type { createGroqText as createGroqTextAdapter } from "@tanstack/ai-groq";

import { createAiTasksRuntime } from "./ai-tasks";

interface GroqCallRecord {
  apiKey: string;
  config: {
    baseURL?: string;
    hasFetch: boolean;
  };
  model: string;
}

interface RecordedCall {
  config: {
    accountId: string;
    cacheTtl: number;
    cfApiKey?: string;
    gatewayId?: string;
    apiKey?: string;
  };
  model: string;
}

const parseCall = (value: string): RecordedCall => JSON.parse(value) as RecordedCall;

const callsForEnv = (calls: RecordedCall[], accountId: string) =>
  calls.filter((call) => call.config.accountId === accountId);

describe("createAiTasksRuntime", () => {
  test("keeps AI client caches isolated per env", async () => {
    const createGroqTextCalls: GroqCallRecord[] = [];
    const createGeminiChatCalls: string[] = [];
    const createWorkersAiChatCalls: string[] = [];
    const groqFetchers: (GroqTextConfig | undefined)[] = [];

    type GroqTextModel = Parameters<typeof createGroqTextAdapter>[0];
    type GeminiChatModel = Parameters<typeof createGeminiChat>[0];
    type GeminiChatConfig = Parameters<typeof createGeminiChat>[1];
    type WorkersAiChatModel = Parameters<typeof createWorkersAiChat>[0];
    type WorkersAiChatConfig = Parameters<typeof createWorkersAiChat>[1];

    interface GroqTextConfig {
      baseURL?: string;
      fetch?: typeof fetch;
    }

    const createGroqTextStub = (model: GroqTextModel, apiKey: string, config?: GroqTextConfig) => {
      createGroqTextCalls.push({
        apiKey,
        config: {
          baseURL: config?.baseURL ?? undefined,
          hasFetch: typeof config?.fetch === "function",
        },
        model,
      });
      groqFetchers.push(config);
      return (() => ({ kind: "chat-adapter" })) as never;
    };

    const createGeminiChatStub = (model: GeminiChatModel, config: GeminiChatConfig) => {
      createGeminiChatCalls.push(JSON.stringify({ config, model }));
      return (() => ({ kind: "chat-adapter" })) as never;
    };

    const createWorkersAiChatStub = (model: WorkersAiChatModel, config: WorkersAiChatConfig) => {
      createWorkersAiChatCalls.push(JSON.stringify({ config, model }));
      return (() => ({ kind: "chat-adapter" })) as never;
    };

    const runtimeA = createAiTasksRuntime(
      {
        CLOUDFLARE_ACCOUNT_ID: "account-a",
        CLOUDFLARE_API_TOKEN: "token-a",
        CLOUDFLARE_GATEWAY: "gateway-a",
      } as never,
      {
        createGeminiChat: createGeminiChatStub as never,
        createGroqText: createGroqTextStub as never,
        createWorkersAiChat: createWorkersAiChatStub as never,
      },
    );

    expect(runtimeA.getAdapters("skill-tagging")).toHaveLength(6);
    expect(runtimeA.getAdapters("skill-categorization")).toHaveLength(6);

    const runtimeB = createAiTasksRuntime(
      {
        CLOUDFLARE_ACCOUNT_ID: "account-b",
        CLOUDFLARE_API_TOKEN: "token-b",
        CLOUDFLARE_GATEWAY: "gateway-b",
      } as never,
      {
        createGeminiChat: createGeminiChatStub as never,
        createGroqText: createGroqTextStub as never,
        createWorkersAiChat: createWorkersAiChatStub as never,
      },
    );

    expect(runtimeB.getAdapters("skill-tagging")).toHaveLength(6);

    expect(createGroqTextCalls).toHaveLength(8);
    expect(createGeminiChatCalls).toHaveLength(8);
    expect(createWorkersAiChatCalls).toHaveLength(8);

    const groqCalls = createGroqTextCalls;
    const geminiCalls = createGeminiChatCalls.map(parseCall);
    const workersAiCalls = createWorkersAiChatCalls.map(parseCall);

    const groqCallsA = groqCalls.filter((call) => call.config.baseURL?.includes("/account-a/"));
    const groqCallsB = groqCalls.filter((call) => call.config.baseURL?.includes("/account-b/"));
    const geminiCallsA = callsForEnv(geminiCalls, "account-a");
    const geminiCallsB = callsForEnv(geminiCalls, "account-b");
    const workersAiCallsA = callsForEnv(workersAiCalls, "account-a");
    const workersAiCallsB = callsForEnv(workersAiCalls, "account-b");

    expect(groqCallsA).toHaveLength(4);
    expect(groqCallsB).toHaveLength(4);
    expect(geminiCallsA).toHaveLength(4);
    expect(geminiCallsB).toHaveLength(4);
    expect(workersAiCallsA).toHaveLength(4);
    expect(workersAiCallsB).toHaveLength(4);

    for (const call of [...groqCallsA, ...groqCallsB]) {
      expect(call.apiKey).toBe("unused");
      expect(call.config.baseURL).toMatch(
        /^https:\/\/gateway\.ai\.cloudflare\.com\/v1\/account-[ab]\/gateway-[ab]\/groq$/,
      );
      expect(call.config.hasFetch).toBe(true);
      expect(["openai/gpt-oss-120b", "meta-llama/llama-4-scout-17b-16e-instruct"]).toContain(
        call.model,
      );
    }

    for (const call of geminiCallsA) {
      expect(["gemini-2.5-flash", "gemini-3.1-flash-lite-preview"]).toContain(call.model);
      expect(call.config.cfApiKey).toBe("token-a");
      expect(call.config.gatewayId).toBe("gateway-a");
    }

    for (const call of geminiCallsB) {
      expect(["gemini-2.5-flash", "gemini-3.1-flash-lite-preview"]).toContain(call.model);
      expect(call.config.cfApiKey).toBe("token-b");
      expect(call.config.gatewayId).toBe("gateway-b");
    }

    for (const call of workersAiCallsA) {
      expect(["@cf/openai/gpt-oss-120b", "@cf/meta/llama-4-scout-17b-16e-instruct"]).toContain(
        call.model,
      );
      expect(call.config.apiKey).toBe("token-a");
      expect(call.config.gatewayId).toBeUndefined();
    }

    for (const call of workersAiCallsB) {
      expect(["@cf/openai/gpt-oss-120b", "@cf/meta/llama-4-scout-17b-16e-instruct"]).toContain(
        call.model,
      );
      expect(call.config.apiKey).toBe("token-b");
      expect(call.config.gatewayId).toBeUndefined();
    }

    const originalFetch = globalThis.fetch;
    const groqFetchCalls: { headers: Headers; init?: RequestInit }[] = [];
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
      groqFetchCalls.push({
        headers: new Headers(init?.headers as never),
        init,
      });
      return Promise.resolve(new Response("ok", { status: 200 }));
    }) as typeof fetch;

    try {
      const [groqConfig] = groqFetchers;
      expect(groqConfig?.fetch).toBeTypeOf("function");
      if (!groqConfig?.fetch) {
        throw new Error("Groq fetch wrapper was not configured.");
      }

      await groqConfig.fetch(
        new Request("https://api.groq.com/openai/v1/chat/completions", {
          body: JSON.stringify({ model: "openai/gpt-oss-120b" }),
          headers: { authorization: "Bearer should-be-stripped" },
          method: "POST",
        }),
      );

      expect(groqFetchCalls).toHaveLength(1);
      const forwardedHeaders = groqFetchCalls[0]?.headers;
      expect(forwardedHeaders?.get("authorization")).toBeNull();
      expect(forwardedHeaders?.get("cf-aig-authorization")).toBe("Bearer token-a");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
