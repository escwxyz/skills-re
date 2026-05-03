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
  autorag(instanceName: string): AiSearchInstance;
  get?(instanceName: string): AiSearchInstance;
  search?: AiSearchInstance["search"];
}

export interface AiSearchRuntimeInput {
  query: string;
  rewriteQuery?: boolean;
}

const DEFAULT_AI_SEARCH_INSTANCE = "curly-voice-daf4";
interface AiSearchRuntimeEnv {
  AI?: AiSearchNamespaceBinding;
  AI_SEARCH_INSTANCE?: string;
  AI_SEARCH_MODEL?: string;
  RAG_ID?: string;
}

const getAiSearchBinding = (env: AiSearchRuntimeEnv & Env) => env.AI ?? null;

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

export function createAiSearchRuntime(env: AiSearchRuntimeEnv & Env): AiSearchRuntime {
  return {
    async search(input: AiSearchRuntimeInput) {
      const instanceName =
        env.RAG_ID?.trim() || env.AI_SEARCH_INSTANCE?.trim() || DEFAULT_AI_SEARCH_INSTANCE;
      const rewriteQuery = input.rewriteQuery ?? true;
      const model = env.AI_SEARCH_MODEL?.trim() || undefined;
      const binding = getAiSearchBinding(env);

      if (binding?.autorag) {
        return (await binding.autorag(instanceName).search({
          ai_search_options: buildSearchOptions(rewriteQuery, model),
          query: input.query,
        })) as AiSearchRuntimeResult;
      }

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

      throw new Error(`AI Search binding is not configured for instance "${instanceName}".`);
    },
  };
}
