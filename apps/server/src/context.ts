import type { Context as ApiContext } from "@skills-re/api/types";
import type { Context as HonoContext } from "hono";

import { createAiSearchRuntime } from "./ai-search";
import { createGithubFetchRuntime } from "./github-fetch";
import { createGithubSubmitRuntime } from "./github-submit";
import { createGithubSnapshotHistoryHelpers } from "./github-history";
import { createSnapshotsHistoryRuntime } from "./snapshots-history";
import { getRepoStatsSyncWorkflowScheduler } from "./workflows/repo-stats";
import { getSnapshotUploadWorkflowScheduler } from "./workflows/snapshot-upload";
import { getSnapshotsArchiveUploadWorkflowScheduler } from "./workflows/snapshots-archive-upload";
import { getSkillsTaggingWorkflowScheduler } from "./workflows/skills-tagging-scheduler";
import { getSkillsUploadWorkflowScheduler } from "./workflows/skills-upload-scheduler";
import type { WorkerLogger } from "./worker-logger";

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
  githubHistory?: ApiContext["githubHistory"];
  githubFetch?: ApiContext["githubFetch"];
  githubSubmit?: ApiContext["githubSubmit"];
  snapshotHistory?: ApiContext["snapshotHistory"];
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
    githubHistory: runtimeDeps.githubHistory,
    githubFetch: runtimeDeps.githubFetch,
    githubSubmit: runtimeDeps.githubSubmit,
    snapshotHistory: runtimeDeps.snapshotHistory,
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
  const aiSearch = createAiSearchRuntime(env);
  const githubHistory = createGithubSnapshotHistoryHelpers(env, {
    logger: options.logger,
  });
  const githubFetch = createGithubFetchRuntime(env, {
    logger: options.logger,
  });
  const githubSubmit = createGithubSubmitRuntime(env, { logger: options.logger });
  const [{ createHistoricalSnapshot }, { listSkillsHistoryInfoByIds }] = await Promise.all([
    import("@skills-re/api/modules/snapshots/service"),
    import("@skills-re/api/modules/skills/repo"),
  ]);

  return {
    aiTasks,
    aiSearch,
    githubHistory,
    githubFetch,
    githubSubmit,
    snapshotHistory: createSnapshotsHistoryRuntime({
      createHistoricalSnapshot,
      githubHistory,
      listSkillsHistoryInfoByIds,
    }),
    workflowSchedulers: {
      repoStatsSync: getRepoStatsSyncWorkflowScheduler(env, { logger: options.logger }),
      snapshotArchiveUpload: getSnapshotsArchiveUploadWorkflowScheduler(env) ?? undefined,
      snapshotUpload: getSnapshotUploadWorkflowScheduler(env) ?? undefined,
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
