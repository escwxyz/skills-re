import { createGeminiChat as createTanstackGeminiChat } from "@tanstack/ai-gemini";
import type { GeminiTextAdapter, GeminiTextModel } from "@tanstack/ai-gemini";

export { createWorkersAiChat } from "@cloudflare/tanstack-ai/adapters/workers-ai";

export interface GeminiGatewayConfig {
  accountId: string;
  apiKey?: string;
  cacheTtl?: number;
  cfApiKey?: string;
  customCacheKey?: string;
  gatewayId: string;
  metadata?: Record<string, unknown>;
  skipCache?: boolean;
}

const buildGeminiGatewayConfig = (config: GeminiGatewayConfig) => {
  const headers: Record<string, string> = {};

  if (config.apiKey && config.cfApiKey) {
    headers["cf-aig-authorization"] = `Bearer ${config.cfApiKey}`;
  }

  if (config.skipCache) {
    headers["cf-aig-skip-cache"] = "true";
  }

  if (typeof config.cacheTtl === "number") {
    headers["cf-aig-cache-ttl"] = String(config.cacheTtl);
  }

  if (typeof config.customCacheKey === "string") {
    headers["cf-aig-cache-key"] = config.customCacheKey;
  }

  if (typeof config.metadata === "object" && config.metadata !== null) {
    headers["cf-aig-metadata"] = JSON.stringify(config.metadata);
  }

  const apiKey = config.apiKey ?? config.cfApiKey;
  if (!apiKey) {
    throw new Error(
      "If you want to use BYOK or unified billing, you need to pass the Cloudflare AI Gateway API key.",
    );
  }

  return {
    apiKey,
    httpOptions: {
      baseUrl: `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/google-ai-studio`,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    },
  };
};

export const createGeminiChat = (
  model: GeminiTextModel,
  config: GeminiGatewayConfig,
): GeminiTextAdapter<GeminiTextModel> => {
  const gatewayConfig = buildGeminiGatewayConfig(config);
  return createTanstackGeminiChat(model, gatewayConfig.apiKey, {
    httpOptions: gatewayConfig.httpOptions,
  });
};
