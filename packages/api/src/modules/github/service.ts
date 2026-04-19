import type { GithubFetchRuntime } from "../../types";

interface GithubFetchInput {
  githubUrl: string;
}

const throwMissingGithubFetchRuntimeError = (): never => {
  throw new Error("GitHub fetch runtime is unavailable. Configure the server GitHub binding.");
};

export async function fetchRepo(
  input: GithubFetchInput,
  runtime?: GithubFetchRuntime,
): Promise<Awaited<ReturnType<GithubFetchRuntime["fetchRepo"]>>> {
  const activeRuntime = runtime;
  if (!activeRuntime) {
    throwMissingGithubFetchRuntimeError();
  }

  return await activeRuntime!.fetchRepo(input);
}
