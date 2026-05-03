import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";

import { createAiSearchItemsRuntime } from "../ai-search";
import { createSnapshotArchiveStorageRuntime } from "../lib/cloudflare/r2";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import { runAiSearchBackfillWorkflow } from "./ai-search-backfill-runner";
import type { AiSearchBackfillWorkflowPayload } from "./ai-search-backfill";

export class AiSearchBackfillWorkflow extends WorkflowEntrypoint<
  Env,
  AiSearchBackfillWorkflowPayload
> {
  async run(event: Readonly<WorkflowEvent<AiSearchBackfillWorkflowPayload>>, step: WorkflowStep) {
    const aiSearchItems = createAiSearchItemsRuntime(this.env as never);
    if (!aiSearchItems) {
      throw new Error("AI_SEARCH binding is not configured.");
    }

    const snapshotStorage = createSnapshotArchiveStorageRuntime(this.env);

    const { listSkillsForAiSearchBackfill, updateSkillAiSearchItemId } =
      await import("@skills-re/api/modules/skills/repo");

    return runWorkflowWithFailureLog({
      entrypoint: "AiSearchBackfillWorkflow",
      instanceId: event.instanceId,
      run: () =>
        runAiSearchBackfillWorkflow(event, step, {
          aiSearchItems,
          listSkillsForAiSearchBackfill,
          snapshotStorage,
          updateSkillAiSearchItemId,
        }),
      workflowName: "skills-re-v1-ai-search-backfill",
    });
  }
}
