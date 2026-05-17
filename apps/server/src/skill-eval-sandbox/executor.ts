export interface SkillEvalRunQueuePayload {
  includeBaseline: boolean;
  requestedAt: number;
  runId: string;
}

export interface EvalRunExecutionContext {
  signal?: AbortSignal;
}

export interface EvalRunExecutionResult {
  completedAt: number;
  status: "pass" | "fail" | "blocked" | "cancelled";
  summary: {
    blockedCases: number;
    failedCases: number;
    passedCases: number;
    totalCases: number;
  };
}

export interface EvalRunExecutor {
  execute(
    payload: SkillEvalRunQueuePayload,
    context?: EvalRunExecutionContext,
  ): Promise<EvalRunExecutionResult>;
}

export const createSkillEvalRunQueuePayload = (input: {
  includeBaseline?: boolean;
  now?: number;
  runId: string;
}): SkillEvalRunQueuePayload => ({
  includeBaseline: input.includeBaseline ?? false,
  requestedAt: input.now ?? Date.now(),
  runId: input.runId,
});
