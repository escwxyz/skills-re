/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type {
  createGeminiChat,
  createOpenAiChat,
  createWorkersAiChat,
} from "@cloudflare/tanstack-ai";

import { createAiTasksRuntime } from "./ai-tasks";

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
  test("keeps AI client caches isolated per env", () => {
    const createOpenAiChatCalls: string[] = [];
    const createGeminiChatCalls: string[] = [];
    const createWorkersAiChatCalls: string[] = [];

    type OpenAiChatModel = Parameters<typeof createOpenAiChat>[0];
    type OpenAiChatConfig = Parameters<typeof createOpenAiChat>[1];
    type GeminiChatModel = Parameters<typeof createGeminiChat>[0];
    type GeminiChatConfig = Parameters<typeof createGeminiChat>[1];
    type WorkersAiChatModel = Parameters<typeof createWorkersAiChat>[0];
    type WorkersAiChatConfig = Parameters<typeof createWorkersAiChat>[1];

    const createOpenAiChatStub = (model: OpenAiChatModel, config: OpenAiChatConfig) => {
      createOpenAiChatCalls.push(JSON.stringify({ config, model }));
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
        createOpenAiChat: createOpenAiChatStub as never,
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
        createOpenAiChat: createOpenAiChatStub as never,
        createWorkersAiChat: createWorkersAiChatStub as never,
      },
    );

    expect(runtimeB.getAdapters("skill-tagging")).toHaveLength(6);

    expect(createOpenAiChatCalls).toHaveLength(8);
    expect(createGeminiChatCalls).toHaveLength(8);
    expect(createWorkersAiChatCalls).toHaveLength(8);

    const openAiCalls = createOpenAiChatCalls.map(parseCall);
    const geminiCalls = createGeminiChatCalls.map(parseCall);
    const workersAiCalls = createWorkersAiChatCalls.map(parseCall);

    const openAiCallsA = callsForEnv(openAiCalls, "account-a");
    const openAiCallsB = callsForEnv(openAiCalls, "account-b");
    const geminiCallsA = callsForEnv(geminiCalls, "account-a");
    const geminiCallsB = callsForEnv(geminiCalls, "account-b");
    const workersAiCallsA = callsForEnv(workersAiCalls, "account-a");
    const workersAiCallsB = callsForEnv(workersAiCalls, "account-b");

    expect(openAiCallsA).toHaveLength(4);
    expect(openAiCallsB).toHaveLength(4);
    expect(geminiCallsA).toHaveLength(4);
    expect(geminiCallsB).toHaveLength(4);
    expect(workersAiCallsA).toHaveLength(4);
    expect(workersAiCallsB).toHaveLength(4);

    for (const call of [...openAiCallsA, ...openAiCallsB]) {
      expect(call.config.cfApiKey).toMatch(/^token-/);
      expect(call.config.gatewayId).toMatch(/^gateway-/);
      expect(call.model.startsWith("groq/")).toBe(true);
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
      expect([
        "@cf/openai/gpt-oss-120b",
        "@cf/meta-llama/llama-4-scout-17b-16e-instruct",
      ]).toContain(call.model);
      expect(call.config.apiKey).toBe("token-a");
      expect(call.config.gatewayId).toBeUndefined();
    }

    for (const call of workersAiCallsB) {
      expect([
        "@cf/openai/gpt-oss-120b",
        "@cf/meta-llama/llama-4-scout-17b-16e-instruct",
      ]).toContain(call.model);
      expect(call.config.apiKey).toBe("token-b");
      expect(call.config.gatewayId).toBeUndefined();
    }
  });
});
