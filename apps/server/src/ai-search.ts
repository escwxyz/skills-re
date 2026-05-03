import type {
  AiSearchItemsRuntime,
  AiSearchRuntime,
  AiSearchRuntimeResult,
} from "@skills-re/api/types";

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

interface AiSearchBinding {
  items: {
    delete(itemId: string): Promise<void>;
    upload(
      filename: string,
      content: string,
      options?: { metadata?: Record<string, string> },
    ): Promise<{ id: string }>;
  };
  search(input: {
    ai_search_options?: {
      query_rewrite?: AiSearchQueryRewriteOptions;
      retrieval?: AiSearchRetrievalOptions;
    };
    query: string;
  }): Promise<unknown>;
}

interface AiSearchRuntimeEnv {
  AI_SEARCH?: AiSearchBinding;
  AI_SEARCH_MODEL?: string;
}

export interface AiSearchRuntimeInput {
  query: string;
  rewriteQuery?: boolean;
}

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
      const binding = env.AI_SEARCH ?? null;
      if (!binding) {
        throw new Error("AI_SEARCH binding is not configured.");
      }

      const rewriteQuery = input.rewriteQuery ?? true;
      const model = env.AI_SEARCH_MODEL?.trim() || undefined;

      return (await binding.search({
        ai_search_options: buildSearchOptions(rewriteQuery, model),
        query: input.query,
      })) as AiSearchRuntimeResult;
    },
  };
}

export function createAiSearchItemsRuntime(
  env: AiSearchRuntimeEnv & Env,
): AiSearchItemsRuntime | null {
  const binding = env.AI_SEARCH ?? null;
  if (!binding) {
    return null;
  }

  return {
    async deleteItem(itemId) {
      await binding.items.delete(itemId);
    },
    async uploadItem(key, content, metadata) {
      return await binding.items.upload(key, content, { metadata });
    },
  };
}
