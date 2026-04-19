import { baseContract } from "./common/base";
import { fetchGithubRepoInputSchema, fetchGithubRepoOutputSchema } from "./common/github";

export const githubContract = {
  fetchRepo: baseContract
    .route({
      description: "Fetches public repository metadata and skill previews from a GitHub URL.",
      method: "POST",
      path: "/github/fetch-repo",
      tags: ["GitHub"],
      successDescription: "Repository metadata and skill previews",
      summary: "Fetch repository metadata",
    })
    .input(fetchGithubRepoInputSchema)
    .output(fetchGithubRepoOutputSchema),
};

export type GithubContract = typeof githubContract;
