import { createGroq } from "@ai-sdk/groq";
import { createAiGateway } from "ai-gateway-provider";
import { createUnified } from "ai-gateway-provider/providers/unified";

import type { AiTaskRuntime, AiTaskType } from "@skills-re/api/types";

interface AiClients {
  aiGateway: ReturnType<typeof createAiGateway>;
  groq: ReturnType<typeof createGroq>;
  unified: ReturnType<typeof createUnified>;
}

interface CreateAiTasksRuntimeOptions {
  createAiGateway?: typeof createAiGateway;
  createGroq?: typeof createGroq;
  createUnified?: typeof createUnified;
}

const getTaskRoutes = (clients: AiClients) =>
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
  }) as const satisfies Record<AiTaskType, unknown[]>;

export const createAiTasksRuntime = (
  env: Pick<Env, "CLOUDFLARE_ACCOUNT_ID" | "CLOUDFLARE_API_TOKEN" | "CLOUDFLARE_GATEWAY">,
  options: CreateAiTasksRuntimeOptions = {},
): AiTaskRuntime => {
  const {
    createAiGateway: createAiGatewayClient = createAiGateway,
    createGroq: createGroqClient = createGroq,
    createUnified: createUnifiedClient = createUnified,
  } = options;

  let cachedAiClients: { key: string; clients: AiClients } | null = null;

  const getAiClients = (): AiClients => {
    const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
    if (!accountId) {
      throw new Error("CLOUDFLARE_ACCOUNT_ID is required for AI tagging.");
    }

    const gateway = env.CLOUDFLARE_GATEWAY?.trim();
    if (!gateway) {
      throw new Error("CLOUDFLARE_GATEWAY is required for AI tagging.");
    }

    const apiToken = env.CLOUDFLARE_API_TOKEN?.trim();
    if (!apiToken) {
      throw new Error("CLOUDFLARE_API_TOKEN is required for AI tagging.");
    }

    const key = `${accountId}|${gateway}|${apiToken}`;
    if (cachedAiClients?.key === key) {
      return cachedAiClients.clients;
    }

    const headers = {
      "cf-aig-authorization": `Bearer ${apiToken}`,
    };

    const clients = {
      aiGateway: createAiGatewayClient({
        accountId,
        apiKey: apiToken,
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
    getModel(task) {
      const clients = getAiClients();
      const taskRoutes = getTaskRoutes(clients);
      return clients.aiGateway([...taskRoutes[task]]);
    },
  };
};
