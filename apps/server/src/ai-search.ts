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

export const SKILLS_REWRITE_PROMPT = `Your task: rewrite the user's search query to find the most relevant AI skills, prompts, and tools in a skills registry.

Context: Users are searching a registry of AI Agent skills — reusable prompts, coding assistants, automation workflows, and AI-powered tools built for developers and teams.

Rules:
- Rewrite the query to describe what kind of AI skill or tool the user is looking for.
- Expand short keyword queries into a phrase that describes a skill's purpose or capability (e.g. "email" → "email automation skill", "code review" → "code review assistant tool").
- Do NOT rewrite as a definitional question — users want skills, not definitions. Never output "What is X?" or "How does X work?".
- Remove conversational filler ("can you", "please", "I want to", "I was wondering").
- Preserve the user's intent — do not change the topic or scope.
- Output only the rewritten query. No preamble, no label.

Examples:

Query: email
Rewrite: email automation skill

Query: code review
Rewrite: code review assistant tool

Query: can you help me write better commit messages
Rewrite: git commit message generator

Query: python debugging
Rewrite: python debugging assistant

Query: What is the best way to summarize documents?
Rewrite: document summarization tool`;

const buildSearchOptions = (rewriteQuery: boolean, model?: string) => ({
  query_rewrite: {
    enabled: rewriteQuery,
    rewrite_prompt: SKILLS_REWRITE_PROMPT,
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

      const result = (await binding.search({
        ai_search_options: buildSearchOptions(rewriteQuery, model),
        query: input.query,
      })) as AiSearchRuntimeResult;

      console.log("[ai-search] raw binding result:", JSON.stringify(result, null, 2));

      return result;
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
