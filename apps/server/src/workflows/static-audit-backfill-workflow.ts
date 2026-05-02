import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";

import { createStaticAuditsService } from "@skills-re/api/modules/static-audits/service";

import { createStaticAuditGithubRuntime } from "../static-audits-github";
import { runStaticAuditBackfillWorkflow } from "./static-audit-backfill-runner";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { StaticAuditBackfillWorkflowPayload } from "./static-audit-backfill";

export class StaticAuditBackfillWorkflow extends WorkflowEntrypoint<
  Env,
  StaticAuditBackfillWorkflowPayload
> {
  run(event: Readonly<WorkflowEvent<StaticAuditBackfillWorkflowPayload>>, step: WorkflowStep) {
    const dispatchRuntime = createStaticAuditGithubRuntime(this.env);
    const staticAudits = createStaticAuditsService({
      dispatchStaticAuditWorkflow: dispatchRuntime.dispatchStaticAuditWorkflow,
    });

    return runWorkflowWithFailureLog({
      entrypoint: "StaticAuditBackfillWorkflow",
      instanceId: event.instanceId,
      run: () =>
        runStaticAuditBackfillWorkflow(event, step, {
          dispatchMissingSnapshotAuditsBatch: staticAudits.dispatchMissingSnapshotAuditsBatch,
        }),
      workflowName: "skills-re-v1-static-audit-backfill",
    });
  }
}
