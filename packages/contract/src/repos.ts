import { z } from "zod";

import { baseContract } from "./common/base";
import {
  repoDuplicateInputSchema,
  repoDuplicateResultSchema,
  repoListItemSchema,
  repoStatsSyncInputSchema,
  repoStatsSyncResultSchema,
  repoStatsUpdateInputSchema,
  repoStatsUpdateResultSchema,
} from "./common/content";
import { githubOwnerSchema } from "./common/slugs";

const repoExistingInputSchema = z.object({
  repoOwner: githubOwnerSchema,
});

const repoListInputSchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .optional();

const reposListContract = baseContract
  .route({
    description:
      "Returns a paginated list of repositories that back public skills and repository browsing.",
    method: "GET",
    path: "/repos",
    tags: ["Repos"],
    successDescription: "Paginated repository list",
    summary: "List repositories",
  })
  .input(repoListInputSchema)
  .output(
    z.object({
      continueCursor: z.string(),
      isDone: z.boolean(),
      repos: z.array(repoListItemSchema),
    }),
  );

const repoDuplicateContract = baseContract
  .route({
    description:
      "Checks whether a GitHub repository path already exists for the current skill source tree.",
    method: "POST",
    path: "/repos/check-duplicated",
    tags: ["Repos"],
    successDescription: "Duplicate repository check result",
    summary: "Check duplicated repository input",
  })
  .input(repoDuplicateInputSchema)
  .output(repoDuplicateResultSchema);

const repoExistingContract = baseContract
  .route({
    description: "Checks whether a repository owner already has a record in the public catalog.",
    method: "GET",
    path: "/repos/check-existing",
    tags: ["Repos"],
    successDescription: "Repository owner existence check",
    summary: "Check repository owner existence",
  })
  .input(repoExistingInputSchema)
  .output(z.boolean());

const repoStatsUpdateContract = baseContract
  .route({
    description: "Updates repository stats for the public catalog.",
    method: "POST",
    path: "/repos/update-stats",
    tags: ["Repos"],
    successDescription: "Repository stats update result",
    summary: "Update repository stats",
  })
  .input(repoStatsUpdateInputSchema)
  .output(repoStatsUpdateResultSchema);

const repoStatsSyncContract = baseContract
  .route({
    description: "Syncs repository stats from GitHub for the current repo page.",
    method: "POST",
    path: "/repos/sync-stats",
    tags: ["Repos"],
    successDescription: "Repository stats sync result",
    summary: "Sync repository stats",
  })
  .input(repoStatsSyncInputSchema)
  .output(repoStatsSyncResultSchema);

const repoStatsEnqueueContract = baseContract
  .route({
    description: "Enqueues a repository stats sync workflow.",
    method: "POST",
    path: "/repos/enqueue-stats-sync",
    tags: ["Repos"],
    successDescription: "Repository stats sync enqueue result",
    summary: "Enqueue repository stats sync",
  })
  .input(
    z
      .object({
        limit: z.number().int().min(1).max(20).optional(),
      })
      .optional(),
  )
  .output(
    z.object({
      workId: z.string(),
    }),
  );

export const reposContract = {
  checkDuplicated: repoDuplicateContract,
  checkExisting: repoExistingContract,
  enqueueRepoStatsSync: repoStatsEnqueueContract,
  listPage: reposListContract,
  syncStats: repoStatsSyncContract,
  updateStats: repoStatsUpdateContract,
} as const;
