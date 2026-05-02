/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { createOpenAiChat } from "@cloudflare/tanstack-ai";

import { createAiTasksRuntime } from "./ai-tasks";

describe("createAiTasksRuntime", () => {
  test("keeps AI client caches isolated per env", () => {
    const createOpenAiChatCalls: string[] = [];

    type OpenAiChatModel = Parameters<typeof createOpenAiChat>[0];
    type OpenAiChatConfig = Parameters<typeof createOpenAiChat>[1];

    const createOpenAiChatStub = (model: OpenAiChatModel, config: OpenAiChatConfig) => {
      createOpenAiChatCalls.push(JSON.stringify({ config, model }));
      return (() => ({ kind: "chat-adapter" })) as never;
    };

    const runtimeA = createAiTasksRuntime(
      {
        CLOUDFLARE_ACCOUNT_ID: "account-a",
        CLOUDFLARE_API_TOKEN: "token-a",
        CLOUDFLARE_GATEWAY: "gateway-a",
      } as never,
      {
        createOpenAiChat: createOpenAiChatStub as never,
      },
    );

    expect(runtimeA.getAdapters("skill-tagging")).toHaveLength(4);
    expect(runtimeA.getAdapters("skill-categorization")).toHaveLength(4);

    const runtimeB = createAiTasksRuntime(
      {
        CLOUDFLARE_ACCOUNT_ID: "account-b",
        CLOUDFLARE_API_TOKEN: "token-b",
        CLOUDFLARE_GATEWAY: "gateway-b",
      } as never,
      {
        createOpenAiChat: createOpenAiChatStub as never,
      },
    );

    expect(runtimeB.getAdapters("skill-tagging")).toHaveLength(4);

    expect(createOpenAiChatCalls).toHaveLength(16);
    expect(createOpenAiChatCalls[0]).toContain("groq/openai/gpt-oss-120b");
    expect(createOpenAiChatCalls[0]).toContain("account-a");
    expect(createOpenAiChatCalls[0]).toContain("gateway-a");
    expect(createOpenAiChatCalls[0]).toContain("token-a");
    expect(createOpenAiChatCalls[8]).toContain("account-b");
    expect(createOpenAiChatCalls[8]).toContain("gateway-b");
    expect(createOpenAiChatCalls[8]).toContain("token-b");
  });
});
