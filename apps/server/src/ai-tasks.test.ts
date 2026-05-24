/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createAiTasksRuntime } from "./ai-tasks";

interface CreateGatewayInput {
  accountId: string;
  apiKey?: string;
  gateway: string;
  options?: {
    cacheTtl?: number;
    retries?: {
      maxAttempts?: number;
    };
  };
}

interface CreateGroqInput {
  headers?: HeadersInit;
}

interface CreateUnifiedInput {
  headers?: HeadersInit;
}

const getHeader = (headers: HeadersInit | undefined, key: string) =>
  new Headers(headers as Bun.HeadersInit | undefined).get(key);

describe("createAiTasksRuntime", () => {
  test("routes task models through Cloudflare AI Gateway", () => {
    const gatewayCalls: CreateGatewayInput[] = [];
    const groqCalls: CreateGroqInput[] = [];
    const unifiedCalls: CreateUnifiedInput[] = [];
    const routedModels: unknown[][] = [];

    const runtime = createAiTasksRuntime(
      {
        CLOUDFLARE_ACCOUNT_ID: "account-a",
        CLOUDFLARE_API_TOKEN: "token-a",
        CLOUDFLARE_GATEWAY: "skills-re",
      } as never,
      {
        createAiGateway: ((input: CreateGatewayInput) => {
          gatewayCalls.push(input);
          return (models: unknown[]) => {
            routedModels.push(models);
            return { kind: "gateway-model", models };
          };
        }) as never,
        createGroq: ((input: CreateGroqInput = {}) => {
          groqCalls.push(input);
          return (model: string) => ({ model, provider: "groq" });
        }) as never,
        createUnified: ((input: CreateUnifiedInput = {}) => {
          unifiedCalls.push(input);
          return (model: string) => ({ model, provider: "unified" });
        }) as never,
      },
    );

    const taggingModel = runtime.getModel("skill-tagging");
    const categorizationModel = runtime.getModel("skill-categorization");

    expect(taggingModel as unknown).toEqual({
      kind: "gateway-model",
      models: [
        {
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          provider: "groq",
        },
        {
          model: "workers-ai/@cf/meta/llama-4-scout-17b-16e-instruct",
          provider: "unified",
        },
        { model: "openai/gpt-oss-120b", provider: "groq" },
        { model: "workers-ai/@cf/openai/gpt-oss-120b", provider: "unified" },
      ],
    });
    expect(categorizationModel as unknown).toEqual({
      kind: "gateway-model",
      models: [
        { model: "openai/gpt-oss-120b", provider: "groq" },
        { model: "workers-ai/@cf/openai/gpt-oss-120b", provider: "unified" },
        {
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          provider: "groq",
        },
        {
          model: "workers-ai/@cf/meta/llama-4-scout-17b-16e-instruct",
          provider: "unified",
        },
      ],
    });

    expect(gatewayCalls).toEqual([
      {
        accountId: "account-a",
        apiKey: "token-a",
        gateway: "skills-re",
        options: {
          cacheTtl: 3600,
          retries: {
            maxAttempts: 2,
          },
        },
      },
    ]);
    expect(routedModels).toHaveLength(2);
    expect(groqCalls).toHaveLength(1);
    expect(unifiedCalls).toHaveLength(1);
    expect(getHeader(groqCalls[0]?.headers, "cf-aig-authorization")).toBe("Bearer token-a");
    expect(getHeader(unifiedCalls[0]?.headers, "cf-aig-authorization")).toBe("Bearer token-a");
  });
});
