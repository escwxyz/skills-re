import type { AiSearchRuntime, AiSearchRuntimeResult } from "@skills-re/api/types";

interface AiSearchQueryRewriteOptions {
  enabled?: boolean;
  model?: string;
  rewrite_prompt?: string;
}

interface AiSearchRetrievalOptions {
  context_expansion?: number;
  filters?: unknown;
  fusion_method?: "rrf" | "max";
  keyword_match_mode?: "and" | "or";
  match_threshold?: number;
  max_num_results?: number;
  metadata_only?: boolean;
  retrieval_type?: "hybrid" | "keyword" | "vector";
  return_on_failure?: boolean;
  boost_by?: {
    direction?: "asc" | "desc" | "exists" | "not_exists";
    field: string;
  }[];
}

interface AiSearchInstance {
  search(input: {
    ai_search_options?: {
      query_rewrite?: AiSearchQueryRewriteOptions;
      retrieval?: AiSearchRetrievalOptions;
    };
    query: string;
  }): Promise<unknown>;
}

interface AiSearchNamespaceBinding {
  get(instanceName: string): AiSearchInstance;
  search?: AiSearchInstance["search"];
}

export interface AiSearchRuntimeInput {
  query: string;
  rewriteQuery?: boolean;
}

interface CreateAiSearchRuntimeOptions {
  fetch?: typeof fetch;
}

const DEFAULT_AI_SEARCH_INSTANCE = "curly-voice-daf4";
type AiSearchRuntimeEnv = Pick<Env, "CLOUDFLARE_ACCOUNT_ID" | "CLOUDFLARE_API_TOKEN"> & {
  AI_SEARCH_INSTANCE?: string;
  AI_SEARCH_MODEL?: string;
};

const getAiSearchBinding = (env: Env) =>
  (env as Env & { AI_SEARCH?: AiSearchNamespaceBinding }).AI_SEARCH ?? null;

const buildSearchOptions = (rewriteQuery: boolean, model?: string) => ({
  query_rewrite: {
    enabled: rewriteQuery,
    ...(model ? { model } : {}),
  },
  retrieval: {
    context_expansion: 0,
    max_num_results: 10,
    retrieval_type: "hybrid" as const,
  },
});

const buildFallbackEndpoint = (accountId: string, instanceName: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/autorag/rags/${instanceName}/search`;

const getJson = async (response: Response, input: string) => {
  if (!response.ok) {
    throw new Error(`AI Search request failed with ${response.status} for ${input}`);
  }

  return (await response.json()) as unknown;
};

export function createAiSearchRuntime(
  env: AiSearchRuntimeEnv & Env,
  options: CreateAiSearchRuntimeOptions = {},
): AiSearchRuntime {
  const fetchImpl = options.fetch ?? fetch;

  return {
    async search(input: AiSearchRuntimeInput) {
      const instanceName = env.AI_SEARCH_INSTANCE?.trim() || DEFAULT_AI_SEARCH_INSTANCE;
      const rewriteQuery = input.rewriteQuery ?? true;
      const model = env.AI_SEARCH_MODEL?.trim() || undefined;
      const binding = getAiSearchBinding(env);

      if (binding?.get) {
        return (await binding.get(instanceName).search({
          ai_search_options: buildSearchOptions(rewriteQuery, model),
          query: input.query,
        })) as AiSearchRuntimeResult;
      }

      if (binding?.search) {
        return (await binding.search({
          ai_search_options: buildSearchOptions(rewriteQuery, model),
          query: input.query,
        })) as AiSearchRuntimeResult;
      }

      const response = await fetchImpl(
        buildFallbackEndpoint(env.CLOUDFLARE_ACCOUNT_ID, instanceName),
        {
          body: JSON.stringify({
            query: input.query,
            rewrite_query: rewriteQuery,
            ...(model ? { model } : {}),
          }),
          headers: {
            authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            "content-type": "application/json",
          },
          method: "POST",
        },
      );

      return (await getJson(response, input.query)) as AiSearchRuntimeResult;
    },
  };
}
