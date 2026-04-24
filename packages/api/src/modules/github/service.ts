import type { GithubFetchRuntime } from "../../types";

interface GithubFetchInput {
  githubUrl: string;
}

export async function fetchRepo(
  input: GithubFetchInput,
  runtime?: GithubFetchRuntime,
): Promise<Awaited<ReturnType<GithubFetchRuntime["fetchRepo"]>>> {
  const activeRuntime = runtime;
  if (!activeRuntime) {
    throw new Error("GitHub fetch runtime is unavailable. Configure the server GitHub binding.");
  }

  return await activeRuntime.fetchRepo(input);
}
