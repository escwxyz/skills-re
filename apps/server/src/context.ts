import type { Context as ApiContext } from "@skills-re/api/types";
import { asSkillId } from "@skills-re/db/utils";
import type { Context as HonoContext } from "hono";

import { createAiSearchItemsRuntime, createAiSearchRuntime } from "./ai-search";
import { createGithubFetchRuntime } from "./github-fetch";
import { createGithubSubmitRuntime } from "./github-submit";
import { createGithubSnapshotHistoryHelpers } from "./github-history";
import { createSnapshotArchiveStorageRuntime } from "./lib/cloudflare/r2";
import { createSnapshotsHistoryRuntime } from "./snapshots-history";
import { getRepoStatsSyncWorkflowScheduler } from "./workflows/repo-stats";
import { getSnapshotUploadWorkflowScheduler } from "./workflows/snapshot-upload";
import { getSnapshotsArchiveUploadWorkflowScheduler } from "./workflows/snapshots-archive-upload";
import { getSkillsTaggingWorkflowScheduler } from "./workflows/skills-tagging-scheduler";
import { getSkillsUploadWorkflowScheduler } from "./workflows/skills-upload-scheduler";
import type { WorkerLogger } from "./worker-logger";
import { createHistoricalSnapshotRunner } from "@skills-re/api/modules/snapshots/service";
import { getSnapshotBySkillAndCommit } from "@skills-re/api/modules/skills/repo";

type ServerHonoContext = HonoContext<{
  Bindings: Env;
  Variables: {
    workerLogger?: WorkerLogger;
  };
}>;

export interface CreateServerContextOptions {
  context: ServerHonoContext;
}

export interface CreateServerRuntimeDeps {
  aiTasks?: ApiContext["aiTasks"];
  aiSearch?: ApiContext["aiSearch"];
  aiSearchItems?: ApiContext["aiSearchItems"];
  githubHistory?: ApiContext["githubHistory"];
  githubFetch?: ApiContext["githubFetch"];
  githubSubmit?: ApiContext["githubSubmit"];
  snapshotHistory?: ApiContext["snapshotHistory"];
  snapshotStorage?: ApiContext["snapshotStorage"];
  workflowSchedulers?: ApiContext["workflowSchedulers"];
}

interface CreateServerRuntimeOptions {
  logger?: WorkerLogger;
}

export function createServerContextFromBase(
  baseContext: {
    auth: null;
    session: ApiContext["session"];
  },
  runtimeDeps: CreateServerRuntimeDeps = {},
  workerLogger?: ApiContext["workerLogger"],
): ApiContext {
  return {
    ...baseContext,
    aiTasks: runtimeDeps.aiTasks,
    aiSearch: runtimeDeps.aiSearch,
    aiSearchItems: runtimeDeps.aiSearchItems,
    githubHistory: runtimeDeps.githubHistory,
    githubFetch: runtimeDeps.githubFetch,
    githubSubmit: runtimeDeps.githubSubmit,
    snapshotHistory: runtimeDeps.snapshotHistory,
    snapshotStorage: runtimeDeps.snapshotStorage,
    workerLogger,
    workflowSchedulers: runtimeDeps.workflowSchedulers,
  };
}

async function createServerRuntime(
  env: Env,
  options: CreateServerRuntimeOptions = {},
): Promise<CreateServerRuntimeDeps> {
  const { createAiTasksRuntime } = await import("./ai-tasks");
  const aiTasks = createAiTasksRuntime(env);
  const aiSearch = createAiSearchRuntime(env as never);
  const aiSearchItems = createAiSearchItemsRuntime(env as never) ?? undefined;
  const githubHistory = createGithubSnapshotHistoryHelpers(env, {
    logger: options.logger,
  });
  const githubFetch = createGithubFetchRuntime(env, {
    logger: options.logger,
  });
  const githubSubmit = createGithubSubmitRuntime(env, { logger: options.logger });
  const snapshotStorage = createSnapshotArchiveStorageRuntime(env);
  const snapshotUploadScheduler = getSnapshotUploadWorkflowScheduler(env);
  const { listSkillsHistoryInfoByIds } = await import("@skills-re/api/modules/skills/repo");
  const createHistoricalSnapshot = createHistoricalSnapshotRunner({
    getSnapshotBySkillAndCommit: async (input) =>
      await getSnapshotBySkillAndCommit({
        skillId: asSkillId(input.skillId),
        sourceCommitSha: input.sourceCommitSha,
      }),
    uploadSnapshotFiles: async (input) => {
      if (!snapshotUploadScheduler) {
        throw new Error("Snapshot upload workflow is not configured.");
      }

      return await snapshotUploadScheduler.enqueue(input);
    },
  });

  return {
    aiTasks,
    aiSearch,
    aiSearchItems,
    githubHistory,
    githubFetch,
    githubSubmit,
    snapshotHistory: createSnapshotsHistoryRuntime({
      createHistoricalSnapshot,
      githubHistory,
      listSkillsHistoryInfoByIds,
    }),
    snapshotStorage,
    workflowSchedulers: {
      repoStatsSync: getRepoStatsSyncWorkflowScheduler(env, { logger: options.logger }),
      snapshotArchiveUpload: getSnapshotsArchiveUploadWorkflowScheduler(env) ?? undefined,
      snapshotUpload: snapshotUploadScheduler ?? undefined,
      skillsTagging: getSkillsTaggingWorkflowScheduler(env) ?? undefined,
      skillsUpload: getSkillsUploadWorkflowScheduler(env) ?? undefined,
    },
  };
}

export async function createServerContext({ context }: CreateServerContextOptions) {
  const { createContext: createApiContext } = await import("@skills-re/api/context");
  const baseContext = await createApiContext({
    context,
  });
  const logger = context.get("workerLogger");
  const runtimeDeps = await createServerRuntime(context.env, { logger });
  return createServerContextFromBase(baseContext, runtimeDeps, logger);
}
