import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";

import { createSnapshotArchiveStorageRuntime } from "../lib/cloudflare/r2";
import { runSkillSearchBackfillWorkflow } from "./skill-search-backfill-runner";
import { getSkillSearchBackfillWorkflowScheduler } from "./skill-search-backfill";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { SkillSearchBackfillWorkflowPayload } from "./skill-search-backfill";

export class SkillSearchBackfillWorkflow extends WorkflowEntrypoint<
  Env,
  SkillSearchBackfillWorkflowPayload
> {
  async run(
    event: Readonly<WorkflowEvent<SkillSearchBackfillWorkflowPayload>>,
    step: WorkflowStep,
  ) {
    const snapshotStorage = createSnapshotArchiveStorageRuntime(this.env);

    return await runWorkflowWithFailureLog({
      entrypoint: "SkillSearchBackfillWorkflow",
      instanceId: event.instanceId,
      run: async () => {
        const { listEligibleSkillSearchBackfillPage, listRepairableSkillSearchBackfillPage } =
          await import("@skills-re/api/modules/skills/search-documents-repo");
        const { refreshSkillSearchDocumentMetadata, replaceSkillSearchDocument } =
          await import("@skills-re/api/modules/skills/search-document-service");

        const result = await runSkillSearchBackfillWorkflow(event, step, {
          listEligibleSkillSearchBackfillPage,
          listRepairableSkillSearchBackfillPage,
          refreshSkillSearchDocumentMetadata,
          replaceSkillSearchDocument,
          scheduleContinuation: getSkillSearchBackfillWorkflowScheduler(this.env),
          snapshotStorage,
        });

        return {
          deletedCount: result.deletedCount,
          failedCount: result.failedCount,
          indexedCount: result.indexedCount,
          isDone: result.isDone,
          metadataDeletedCount: result.metadataDeletedCount,
          metadataRefreshedCount: result.metadataRefreshedCount,
          processedCount: result.processedCount,
          skippedCount: result.skippedCount,
        };
      },
      workflowName: "skills-re-v1-skill-search-backfill",
    });
  }
}
