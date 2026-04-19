import { createGroq } from "@ai-sdk/groq";
import { createAiGateway } from "ai-gateway-provider";
import { createUnified } from "ai-gateway-provider/providers/unified";

import type { AiTaskRuntime, AiTaskType } from "@skills-re/api/types";

interface AiClients {
  aiGateway: ReturnType<typeof createAiGateway>;
  groq: ReturnType<typeof createGroq>;
  unified: ReturnType<typeof createUnified>;
}

let cachedAiClients: AiClients | null = null;

const getAiClients = (
  env: Pick<Env, "CLOUDFLARE_ACCOUNT_ID" | "CLOUDFLARE_API_TOKEN" | "CLOUDFLARE_GATEWAY">,
): AiClients => {
  if (cachedAiClients) {
    return cachedAiClients;
  }

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

  const headers = {
    "cf-aig-authorization": `Bearer ${apiToken}`,
  };

  cachedAiClients = {
    aiGateway: createAiGateway({
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
    groq: createGroq({ headers }),
    unified: createUnified({ headers }),
  };

  return cachedAiClients;
};

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
): AiTaskRuntime => ({
  getModel(task) {
    const clients = getAiClients(env);
    const taskRoutes = getTaskRoutes(clients);
    return clients.aiGateway([...taskRoutes[task]]);
  },
});
