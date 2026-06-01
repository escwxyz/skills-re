export type SkillEvalRunEventKind =
  | "agent_message"
  | "artifact"
  | "case_finished"
  | "case_started"
  | "error"
  | "policy_block"
  | "status"
  | "stderr"
  | "stdout"
  | "summary";

export type SkillEvalRunEventStatus =
  | "blocked"
  | "cancelled"
  | "fail"
  | "pass"
  | "pending"
  | "queued"
  | "running";

export interface SkillEvalRunEventBase {
  caseId?: string;
  eventId: string;
  kind: SkillEvalRunEventKind;
  message?: string;
  runId: string;
  sequence: number;
  syncTime: number;
}

export interface SkillEvalStatusEvent extends SkillEvalRunEventBase {
  kind: "status";
  payload: {
    from?: SkillEvalRunEventStatus;
    to: SkillEvalRunEventStatus;
  };
}

export interface SkillEvalTerminalChunkEvent extends SkillEvalRunEventBase {
  kind: "stderr" | "stdout";
  payload: {
    chunk: string;
    truncated?: boolean;
  };
}

export interface SkillEvalAgentMessageEvent extends SkillEvalRunEventBase {
  kind: "agent_message";
  payload: {
    content: string;
    role?: string;
  };
}

export interface SkillEvalCaseStartedEvent extends SkillEvalRunEventBase {
  caseId: string;
  kind: "case_started";
  payload: {
    mode?: "baseline" | "with_skill";
  };
}

export interface SkillEvalCaseFinishedEvent extends SkillEvalRunEventBase {
  caseId: string;
  kind: "case_finished";
  payload: {
    durationMs?: number;
    mode?: "baseline" | "with_skill";
    score?: number;
    status: "blocked" | "fail" | "pass";
  };
}

export interface SkillEvalArtifactEvent extends SkillEvalRunEventBase {
  caseId?: string;
  kind: "artifact";
  payload: {
    contentType?: string;
    key: string;
    label: string;
    size?: number;
  };
}

export interface SkillEvalPolicyBlockEvent extends SkillEvalRunEventBase {
  caseId?: string;
  kind: "policy_block";
  payload: {
    code: string;
    evidence?: string;
  };
}

export interface SkillEvalErrorEvent extends SkillEvalRunEventBase {
  caseId?: string;
  kind: "error";
  payload: {
    code: string;
    terminalStatus?: "blocked" | "cancelled" | "fail";
  };
}

export interface SkillEvalSummaryEvent extends SkillEvalRunEventBase {
  kind: "summary";
  payload: {
    blockedCases: number;
    failedCases: number;
    passedCases: number;
    totalCases: number;
  };
}

export type SkillEvalRunEvent =
  | SkillEvalAgentMessageEvent
  | SkillEvalArtifactEvent
  | SkillEvalCaseFinishedEvent
  | SkillEvalCaseStartedEvent
  | SkillEvalErrorEvent
  | SkillEvalPolicyBlockEvent
  | SkillEvalStatusEvent
  | SkillEvalSummaryEvent
  | SkillEvalTerminalChunkEvent;

export const createSkillEvalRunEvent = <T extends SkillEvalRunEvent>(input: {
  event: Omit<T, "eventId" | "sequence" | "syncTime"> &
    Partial<Pick<T, "eventId" | "sequence" | "syncTime">>;
  nextSequence: number;
  now?: number;
}): T => {
  const sequence = input.event.sequence ?? input.nextSequence;
  return {
    ...input.event,
    eventId: input.event.eventId ?? `${input.event.runId}:${sequence}`,
    sequence,
    syncTime: input.event.syncTime ?? input.now ?? Date.now(),
  } as T;
};

export const serializeSkillEvalRunEvent = (event: SkillEvalRunEvent) =>
  `${JSON.stringify(event)}\n`;
