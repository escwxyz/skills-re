import { createOpenAiChat } from "@cloudflare/tanstack-ai";

import type { AiTaskAdapter, AiTaskRuntime, AiTaskType } from "@skills-re/api/types";

interface CreateAiTasksRuntimeOptions {
  createOpenAiChat?: typeof createOpenAiChat;
}

const getTaskAdapters = (clients: { createAdapter: (model: string) => AiTaskAdapter }) =>
  ({
    "skill-categorization": [
      clients.createAdapter("groq/openai/gpt-oss-120b"),
      clients.createAdapter("workers-ai/@cf/openai/gpt-oss-120b"),
      clients.createAdapter("groq/meta-llama/llama-4-scout-17b-16e-instruct"),
      clients.createAdapter("workers-ai/@cf/meta/llama-4-scout-17b-16e-instruct"),
    ],
    "skill-tagging": [
      clients.createAdapter("groq/meta-llama/llama-4-scout-17b-16e-instruct"),
      clients.createAdapter("workers-ai/@cf/meta/llama-4-scout-17b-16e-instruct"),
      clients.createAdapter("groq/openai/gpt-oss-120b"),
      clients.createAdapter("workers-ai/@cf/openai/gpt-oss-120b"),
    ],
  }) as const satisfies Record<AiTaskType, readonly AiTaskAdapter[]>;

export const createAiTasksRuntime = (
  env: Pick<Env, "CLOUDFLARE_ACCOUNT_ID" | "CLOUDFLARE_API_TOKEN" | "CLOUDFLARE_GATEWAY">,
  options: CreateAiTasksRuntimeOptions = {},
): AiTaskRuntime => {
  const createOpenAiChatClient = options.createOpenAiChat ?? createOpenAiChat;

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

    const config = {
      accountId,
      cacheTtl: 3600,
      cfApiKey,
      gatewayId,
    };

    const createAdapter = (model: string) =>
      createOpenAiChatClient(model as never, config) as unknown as AiTaskAdapter;

    const adaptersByTask = getTaskAdapters({
      createAdapter,
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
