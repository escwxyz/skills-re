/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { createGroq } from "@ai-sdk/groq";
import type { createAiGateway } from "ai-gateway-provider";
import type { createUnified } from "ai-gateway-provider/providers/unified";

import { createAiTasksRuntime } from "./ai-tasks";

describe("createAiTasksRuntime", () => {
  test("keeps AI client caches isolated per env", () => {
    const createAiGatewayCalls: string[] = [];
    const createGroqCalls: string[] = [];
    const createUnifiedCalls: string[] = [];

    type AiGatewayOptions = Parameters<typeof createAiGateway>[0];
    type GroqOptions = Parameters<typeof createGroq>[0];
    type UnifiedOptions = Parameters<typeof createUnified>[0];

    const createAiGatewayStub = (input: AiGatewayOptions) => {
      createAiGatewayCalls.push(JSON.stringify(input));

      return (() => ({ kind: "ai-gateway" })) as never;
    };

    const createGroqStub = (input: GroqOptions = {}) => {
      createGroqCalls.push(JSON.stringify(input));
      return (() => ({ kind: "groq" })) as never;
    };

    const createUnifiedStub = (input: UnifiedOptions = {}) => {
      createUnifiedCalls.push(JSON.stringify(input));
      return (() => ({ kind: "unified" })) as never;
    };

    const runtimeA = createAiTasksRuntime(
      {
        CLOUDFLARE_ACCOUNT_ID: "account-a",
        CLOUDFLARE_API_TOKEN: "token-a",
        CLOUDFLARE_GATEWAY: "gateway-a",
      } as never,
      {
        createAiGateway: createAiGatewayStub,
        createGroq: createGroqStub,
        createUnified: createUnifiedStub,
      },
    );

    runtimeA.getModel("skill-tagging");
    runtimeA.getModel("skill-categorization");

    const runtimeB = createAiTasksRuntime(
      {
        CLOUDFLARE_ACCOUNT_ID: "account-b",
        CLOUDFLARE_API_TOKEN: "token-b",
        CLOUDFLARE_GATEWAY: "gateway-b",
      } as never,
      {
        createAiGateway: createAiGatewayStub,
        createGroq: createGroqStub,
        createUnified: createUnifiedStub,
      },
    );

    runtimeB.getModel("skill-tagging");

    expect(createAiGatewayCalls[0]).toContain("account-a");
    expect(createAiGatewayCalls[0]).toContain("gateway-a");
    expect(createAiGatewayCalls[0]).toContain("token-a");
    expect(createAiGatewayCalls[1]).toContain("account-b");
    expect(createAiGatewayCalls[1]).toContain("gateway-b");
    expect(createAiGatewayCalls[1]).toContain("token-b");
    expect(createGroqCalls).toHaveLength(2);
    expect(createUnifiedCalls).toHaveLength(2);
  });
});
