import { createGroq } from "@ai-sdk/groq";
import { createAiGateway } from "ai-gateway-provider";
import { createUnified } from "ai-gateway-provider/providers/unified";

import type { AiTaskRuntime, AiTaskType } from "@skills-re/api/types";

type AiGatewayClient = ReturnType<typeof createAiGateway>;
type GroqClient = ReturnType<typeof createGroq>;
type UnifiedClient = ReturnType<typeof createUnified>;

interface AiClients {
  aiGateway: AiGatewayClient;
  groq: GroqClient;
  unified: UnifiedClient;
}

interface CreateAiTasksRuntimeOptions {
  createAiGateway?: typeof createAiGateway;
  createGroq?: typeof createGroq;
  createUnified?: typeof createUnified;
}

const getTaskModels = (clients: Pick<AiClients, "groq" | "unified">) =>
  ({
    "skill-categorization": [
      clients.groq("openai/gpt-oss-120b"),
      clients.unified("workers-ai/@cf/openai/gpt-oss-120b"),
      clients.groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      clients.unified("workers-ai/@cf/meta/llama-4-scout-17b-16e-instruct"),
    ],
    "skill-tagging": [
      clients.groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      clients.unified("workers-ai/@cf/meta/llama-4-scout-17b-16e-instruct"),
      clients.groq("openai/gpt-oss-120b"),
      clients.unified("workers-ai/@cf/openai/gpt-oss-120b"),
    ],
  }) as const;

export const createAiTasksRuntime = (
  env: Pick<
    Env,
    "CLOUDFLARE_ACCOUNT_ID" | "CLOUDFLARE_AI_GATEWAY_API_TOKEN" | "CLOUDFLARE_GATEWAY"
  >,
  options: CreateAiTasksRuntimeOptions = {},
): AiTaskRuntime => {
  const createAiGatewayClient = options.createAiGateway ?? createAiGateway;
  const createGroqClient = options.createGroq ?? createGroq;
  const createUnifiedClient = options.createUnified ?? createUnified;

  let cachedAiClients: {
    clients: AiClients;
    key: string;
  } | null = null;

  const getAiClients = () => {
    const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
    if (!accountId) {
      throw new Error("CLOUDFLARE_ACCOUNT_ID is required for AI Gateway routing.");
    }

    const gateway = env.CLOUDFLARE_GATEWAY?.trim();
    if (!gateway) {
      throw new Error("CLOUDFLARE_GATEWAY is required for AI Gateway routing.");
    }

    const apiKey = env.CLOUDFLARE_AI_GATEWAY_API_TOKEN?.trim();
    if (!apiKey) {
      throw new Error("CLOUDFLARE_AI_GATEWAY_API_TOKEN is required for AI Gateway routing.");
    }

    const key = `${accountId}|${gateway}|${apiKey}`;
    if (cachedAiClients?.key === key) {
      return cachedAiClients.clients;
    }

    const headers = {
      "cf-aig-authorization": `Bearer ${apiKey}`,
    };

    const clients = {
      aiGateway: createAiGatewayClient({
        accountId,
        apiKey,
        gateway,
        options: {
          cacheTtl: 3600,
          retries: {
            maxAttempts: 2,
          },
        },
      }),
      groq: createGroqClient({ headers }),
      unified: createUnifiedClient({ headers }),
    };

    cachedAiClients = {
      clients,
      key,
    };

    return clients;
  };

  return {
    getModels(task: AiTaskType) {
      const clients = getAiClients();
      const taskModels = getTaskModels(clients);
      return taskModels[task].map((model) => clients.aiGateway([model]));
    },
  };
};
