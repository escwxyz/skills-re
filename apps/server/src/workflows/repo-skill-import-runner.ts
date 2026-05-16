import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import type { GithubSubmitRuntime, SkillsUploadScheduler } from "@skills-re/api/types";

import type { RepoSkillImportWorkflowPayload } from "./repo-skills-discovery";

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface RepoSkillImportWorkflowDeps {
  githubSubmit: GithubSubmitRuntime;
  skillsUploadScheduler?: SkillsUploadScheduler | null;
}

export const runRepoSkillImportWorkflow = async (
  event: Readonly<WorkflowEvent<RepoSkillImportWorkflowPayload>>,
  step: WorkflowStep,
  deps: RepoSkillImportWorkflowDeps,
) => {
  const { skillsUploadScheduler } = deps;
  if (!skillsUploadScheduler) {
    throw new Error("Skills upload workflow scheduler is unavailable.");
  }

  const payloadResult = await step.do(
    "build-root-scoped-github-payload",
    workflowStepRetryPolicy.repoSkillImport,
    async () =>
      await deps.githubSubmit.buildPayload({
        owner: event.payload.repoOwner,
        repo: event.payload.repoName,
        skillRootPath: event.payload.skillRootPath,
      }),
  );

  if (!payloadResult.payload) {
    return {
      reason: payloadResult.reason ?? "no-valid-skills",
      status: "skipped" as const,
    };
  }
  const uploadPayload = payloadResult.payload;

  const scheduled = await step.do(
    "schedule-skills-upload",
    workflowStepRetryPolicy.repoSkillImport,
    async () => await skillsUploadScheduler.enqueue(uploadPayload),
  );

  return {
    status: "submitted" as const,
    workId: scheduled?.workId ?? "",
  };
};
