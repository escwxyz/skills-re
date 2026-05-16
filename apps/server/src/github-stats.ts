import { createGithubHeaders, fetchGithubJson } from "./github-api";
import type { WorkerLogger } from "./worker-logger";

interface CreateGithubRepoStatsRuntimeOptions {
  fetch?: typeof fetch;
  logger?: WorkerLogger;
}

export const createGithubRepoStatsRuntime = (
  env: Partial<Pick<Env, "GH_PAT">>,
  options: CreateGithubRepoStatsRuntimeOptions = {},
) => {
  const fetchImpl = options.fetch ?? fetch;
  const headers = createGithubHeaders(env);
  const logger = options.logger?.child({
    component: "github-stats",
    hasGithubToken: Boolean(env.GH_PAT),
  });

  return {
    async fetchRepoStats(
      query: string,
      variables: {
        name: string;
        owner: string;
      },
    ) {
      const response = await fetchGithubJson<{
        data?: unknown;
      }>(
        fetchImpl,
        "https://api.github.com/graphql",
        {
          body: JSON.stringify({
            query,
            variables,
          }),
          headers,
          method: "POST",
        },
        {
          includeResponseMessage: true,
          logger,
          logContext: {
            operation: "repo-stats",
            owner: variables.owner,
            repo: variables.name,
          },
        },
      );

      if (!response.data) {
        throw new Error("GitHub stats response is missing data.");
      }

      return response.data;
    },
  };
};
