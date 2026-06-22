import {
  PAGEFIND_HYDRATION_LIMIT,
  pagefindGenerationManifestSchema,
} from "@skills-re/contract/pagefind";

import type { BrowseSkillItem } from "@/utils/types";

export const PAGEFIND_BROWSER_RANKING = {
  metaWeights: {
    author: 3,
    description: 2,
    repository: 3,
    title: 8,
  },
} as const;

interface PagefindResultData {
  meta?: { skillId?: string };
  plain_excerpt?: string;
}

interface PagefindRuntime {
  init: () => Promise<unknown>;
  options: (options: Record<string, unknown>) => Promise<unknown>;
  search: (
    query: string,
    options: { filters?: Record<string, string[]> },
  ) => Promise<{
    results: { data: () => Promise<PagefindResultData> }[];
  }>;
}

interface PagefindSearchDeps {
  emitDiagnostics?: (diagnostics: Record<string, unknown>) => void;
  fetchManifest: () => Promise<unknown>;
  hydrate: (skillIds: string[]) => Promise<BrowseSkillItem[]>;
  importRuntime: (bundleUrl: string) => Promise<PagefindRuntime>;
  now?: () => number;
}

interface PagefindSearchInput {
  categories?: string[];
  limit: number;
  query: string;
  tags?: string[];
}

const chunkSkillIds = (skillIds: string[]) => {
  const batches: string[][] = [];
  for (let index = 0; index < skillIds.length; index += PAGEFIND_HYDRATION_LIMIT) {
    batches.push(skillIds.slice(index, index + PAGEFIND_HYDRATION_LIMIT));
  }
  return batches;
};

export const createPagefindSearchAdapter = (deps: PagefindSearchDeps) => {
  const now = deps.now ?? Date.now;
  let sessionPromise:
    | Promise<{
        manifest: ReturnType<typeof pagefindGenerationManifestSchema.parse>;
        runtime: PagefindRuntime;
      }>
    | undefined;

  const getSession = () => {
    sessionPromise ??= (async () => {
      const manifest = pagefindGenerationManifestSchema.parse(await deps.fetchManifest());
      const runtime = await deps.importRuntime(manifest.bundleUrl);
      await runtime.options({
        basePath: manifest.bundleUrl,
        ranking: PAGEFIND_BROWSER_RANKING,
      });
      await runtime.init();
      return { manifest, runtime };
    })();
    return sessionPromise;
  };

  return {
    async search(input: PagefindSearchInput) {
      const startedAt = now();
      try {
        const { manifest, runtime } = await getSession();
        const initializedAt = now();
        const filters: Record<string, string[]> = {};
        if (input.categories?.length) {
          filters.category = input.categories;
        }
        if (input.tags?.length) {
          filters.tags = input.tags;
        }
        const search = await runtime.search(
          input.query,
          Object.keys(filters).length > 0 ? { filters } : {},
        );
        const searchedAt = now();
        const hitData = await Promise.all(
          search.results.slice(0, input.limit * 3).map(async (result) => await result.data()),
        );
        const hits = hitData.flatMap((data) => {
          const skillId = data.meta?.skillId?.trim();
          return skillId ? [{ excerpt: data.plain_excerpt, skillId }] : [];
        });
        const uniqueSkillIds = [...new Set(hits.map((hit) => hit.skillId))];
        const hydratedBatches = await Promise.all(
          chunkSkillIds(uniqueSkillIds).map(async (skillIds) => await deps.hydrate(skillIds)),
        );
        const hydrated = hydratedBatches.flat();
        const hydratedById = new Map(hydrated.map((item) => [item.id, item] as const));
        const page = hits
          .flatMap((hit) => {
            const item = hydratedById.get(hit.skillId);
            return item
              ? [
                  {
                    ...item,
                    aiMatch: hit.excerpt
                      ? {
                          snippet: hit.excerpt,
                          sourcePath: "SKILL.md",
                        }
                      : undefined,
                  },
                ]
              : [];
          })
          .slice(0, input.limit);
        const completedAt = now();
        deps.emitDiagnostics?.({
          generationId: manifest.generationId,
          hydrationMs: completedAt - searchedAt,
          indexAgeMs: Math.max(0, completedAt - manifest.publishedAt),
          initializationMs: initializedAt - startedAt,
          resultCount: page.length,
          searchMs: searchedAt - initializedAt,
        });
        return {
          continueCursor: "",
          generationId: manifest.generationId,
          isDone: search.results.length <= hits.length,
          page,
        };
      } catch (error) {
        sessionPromise = undefined;
        deps.emitDiagnostics?.({
          failureStage: "pagefind-search",
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  };
};
