import { createGeminiChat, createOpenAiChat, createWorkersAiChat } from "@cloudflare/tanstack-ai";

import type { AiTaskAdapter, AiTaskRuntime, AiTaskType } from "@skills-re/api/types";

interface CreateAiTasksRuntimeOptions {
  createGeminiChat?: typeof createGeminiChat;
  createOpenAiChat?: typeof createOpenAiChat;
  createWorkersAiChat?: typeof createWorkersAiChat;
}

type GroqTaskModel = "openai/gpt-oss-120b" | "meta-llama/llama-4-scout-17b-16e-instruct";
type GeminiTaskModel = "gemini-3.1-flash-lite-preview" | "gemini-2.5-flash";
type WorkersAiTaskModel =
  | "@cf/openai/gpt-oss-120b"
  | "@cf/meta-llama/llama-4-scout-17b-16e-instruct";

const getTaskAdapters = (clients: {
  createGeminiAdapter: (model: GeminiTaskModel) => AiTaskAdapter;
  createGroqAdapter: (model: GroqTaskModel) => AiTaskAdapter;
  createWorkersAiAdapter: (model: WorkersAiTaskModel) => AiTaskAdapter;
}) =>
  ({
    "skill-categorization": [
      clients.createGroqAdapter("openai/gpt-oss-120b"),
      clients.createGeminiAdapter("gemini-3.1-flash-lite-preview"),
      clients.createGroqAdapter("meta-llama/llama-4-scout-17b-16e-instruct"),
      clients.createGeminiAdapter("gemini-2.5-flash"),
      clients.createWorkersAiAdapter("@cf/openai/gpt-oss-120b"),
      clients.createWorkersAiAdapter("@cf/meta-llama/llama-4-scout-17b-16e-instruct"),
    ],
    "skill-tagging": [
      clients.createGroqAdapter("meta-llama/llama-4-scout-17b-16e-instruct"),
      clients.createGeminiAdapter("gemini-2.5-flash"),
      clients.createGroqAdapter("openai/gpt-oss-120b"),
      clients.createGeminiAdapter("gemini-3.1-flash-lite-preview"),
      clients.createWorkersAiAdapter("@cf/meta-llama/llama-4-scout-17b-16e-instruct"),
      clients.createWorkersAiAdapter("@cf/openai/gpt-oss-120b"),
    ],
  }) as const satisfies Record<AiTaskType, readonly AiTaskAdapter[]>;

export const createAiTasksRuntime = (
  env: Pick<Env, "CLOUDFLARE_ACCOUNT_ID" | "CLOUDFLARE_API_TOKEN" | "CLOUDFLARE_GATEWAY">,
  options: CreateAiTasksRuntimeOptions = {},
): AiTaskRuntime => {
  const createGeminiChatClient = options.createGeminiChat ?? createGeminiChat;
  const createOpenAiChatClient = options.createOpenAiChat ?? createOpenAiChat;
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
      createGeminiChatClient(
        model as Parameters<typeof createGeminiChat>[0],
        gatewayConfig,
      ) as unknown as AiTaskAdapter;

    // Groq is exposed through Cloudflare AI Gateway's OpenAI-compatible path.
    const createGroqAdapter = (model: GroqTaskModel) =>
      createOpenAiChatClient(`groq/${model}` as never, gatewayConfig) as unknown as AiTaskAdapter;

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
