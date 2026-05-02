import { createGeminiChat, createWorkersAiChat } from "@cloudflare/tanstack-ai";
import { createGroqText } from "@tanstack/ai-groq";

import type { AiTaskAdapter, AiTaskRuntime, AiTaskType } from "@skills-re/api/types";

interface CreateAiTasksRuntimeOptions {
  createGeminiChat?: typeof createGeminiChat;
  createGroqText?: typeof createGroqText;
  createWorkersAiChat?: typeof createWorkersAiChat;
}

type GroqTaskModel = Parameters<typeof createGroqText>[0];
type GeminiTaskModel = Parameters<typeof createGeminiChat>[0];
type WorkersAiTaskModel = Parameters<typeof createWorkersAiChat>[0];

const GROQ_GW_API_KEY_PLACEHOLDER = "unused";

const createGroqGatewayFetch = (cfApiKeyValue: string) => {
  const wrappedFetch = ((input, init) => {
    const headers = new Headers(init?.headers as never);
    headers.delete("authorization");
    headers.set("cf-aig-authorization", `Bearer ${cfApiKeyValue}`);

    return fetch(input, {
      ...init,
      headers,
    });
  }) as typeof fetch;
  return wrappedFetch;
};

const getTaskAdapters = (clients: {
  createGeminiAdapter: (model: GeminiTaskModel) => AiTaskAdapter;
  createGroqAdapter: (model: GroqTaskModel) => AiTaskAdapter;
  createWorkersAiAdapter: (model: WorkersAiTaskModel) => AiTaskAdapter;
}) =>
  ({
    "skill-categorization": [
      clients.createGroqAdapter("openai/gpt-oss-120b"),
      clients.createGroqAdapter("meta-llama/llama-4-scout-17b-16e-instruct"),
      clients.createWorkersAiAdapter("@cf/openai/gpt-oss-120b"),
      clients.createWorkersAiAdapter("@cf/meta/llama-4-scout-17b-16e-instruct"),
      clients.createGeminiAdapter("gemini-3.1-flash-lite-preview"),
      clients.createGeminiAdapter("gemini-2.5-flash"),
    ],
    "skill-tagging": [
      clients.createGroqAdapter("meta-llama/llama-4-scout-17b-16e-instruct"),
      clients.createGroqAdapter("openai/gpt-oss-120b"),
      clients.createWorkersAiAdapter("@cf/meta/llama-4-scout-17b-16e-instruct"),
      clients.createWorkersAiAdapter("@cf/openai/gpt-oss-120b"),
      clients.createGeminiAdapter("gemini-3.1-flash-lite-preview"),
      clients.createGeminiAdapter("gemini-2.5-flash"),
    ],
  }) as const satisfies Record<AiTaskType, readonly AiTaskAdapter[]>;

export const createAiTasksRuntime = (
  env: Pick<Env, "CLOUDFLARE_ACCOUNT_ID" | "CLOUDFLARE_API_TOKEN" | "CLOUDFLARE_GATEWAY">,
  options: CreateAiTasksRuntimeOptions = {},
): AiTaskRuntime => {
  const createGeminiChatClient = options.createGeminiChat ?? createGeminiChat;
  const createGroqTextClient = options.createGroqText ?? createGroqText;
  const createWorkersAiChatClient = options.createWorkersAiChat ?? createWorkersAiChat;

  let cachedAiClients: {
    adaptersByTask: Record<AiTaskType, readonly AiTaskAdapter[]>;
    key: string;
  } | null = null;

  const getAiClients = () => {
    const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
    if (!accountId) {
      throw new Error("CLOUDFLARE_ACCOUNT_ID is required for AI Gateway routing.");
    }

    const gatewayId = env.CLOUDFLARE_GATEWAY?.trim();
    if (!gatewayId) {
      throw new Error("CLOUDFLARE_GATEWAY is required for AI Gateway routing.");
    }

    const cfApiKey = env.CLOUDFLARE_API_TOKEN?.trim();
    if (!cfApiKey) {
      throw new Error("CLOUDFLARE_API_TOKEN is required for AI Gateway routing.");
    }

    const key = `${accountId}|${gatewayId}|${cfApiKey}`;
    if (cachedAiClients?.key === key) {
      return cachedAiClients;
    }

    const gatewayConfig = {
      accountId,
      cacheTtl: 3600,
      cfApiKey,
      gatewayId,
    };

    const createGeminiAdapter = (model: GeminiTaskModel) =>
      createGeminiChatClient(model, gatewayConfig) as unknown as AiTaskAdapter;

    // Groq uses Cloudflare AI Gateway's provider-specific /groq path so the gateway
    // can apply the stored Groq key instead of routing through the OpenAI schema.
    const createGroqAdapter = (model: GroqTaskModel) =>
      createGroqTextClient(model, GROQ_GW_API_KEY_PLACEHOLDER, {
        baseURL: `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/groq`,
        fetch: createGroqGatewayFetch(cfApiKey),
      }) as unknown as AiTaskAdapter;

    const createWorkersAiAdapter = (model: WorkersAiTaskModel) =>
      createWorkersAiChatClient(model, {
        accountId,
        apiKey: cfApiKey,
      }) as unknown as AiTaskAdapter;

    const adaptersByTask = getTaskAdapters({
      createGeminiAdapter,
      createGroqAdapter,
      createWorkersAiAdapter,
    });

    cachedAiClients = {
      adaptersByTask,
      key,
    };

    return cachedAiClients;
  };

  return {
    getAdapters(task) {
      const clients = getAiClients();
      return [...clients.adaptersByTask[task]];
    },
  };
};
