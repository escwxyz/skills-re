import { z } from "zod";

import { baseContract } from "./common/base";
import { cursorSchema, idSchema } from "./common/ids";

export const skillEvalRunStatusSchema = z.enum([
  "pending",
  "queued",
  "running",
  "pass",
  "fail",
  "blocked",
  "cancelled",
]);

export const skillEvalCaseStatusSchema = z.enum(["pending", "running", "pass", "fail", "blocked"]);

export const skillEvalSuiteStatusSchema = z.enum(["valid", "invalid", "missing"]);

export const skillEvalAgentStatusSchema = z.enum(["active", "deprecated", "disabled"]);

export const skillEvalNetworkModeSchema = z.enum(["deny", "allow"]);

export const skillEvalArtifactSchema = z.object({
  contentType: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  key: z.string().min(1),
  label: z.string().min(1),
  size: z.number().int().nonnegative().optional(),
});

export const skillEvalLimitsSchema = z.object({
  maxOutputBytes: z.number().int().nonnegative(),
  maxSteps: z.number().int().nonnegative(),
  timeoutMs: z.number().int().nonnegative(),
});

export const skillEvalNetworkPolicySchema = z.object({
  allowlist: z.array(z.string()),
  blockMetadataEndpoints: z.boolean(),
  blockPrivateRanges: z.boolean(),
  maxBytes: z.number().int().nonnegative(),
  maxRequests: z.number().int().nonnegative(),
  mode: skillEvalNetworkModeSchema,
});

export const skillEvalAgentSchema = z.object({
  capabilities: z.object({
    supportsBaseline: z.boolean(),
    supportsFilesystem: z.boolean(),
    supportsStreaming: z.boolean(),
    supportsTokenUsage: z.boolean().optional(),
  }),
  defaultLimits: skillEvalLimitsSchema,
  description: z.string().min(1).optional(),
  displayName: z.string().min(1),
  id: idSchema,
  provider: z.string().min(1),
  runtimeFamily: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
  status: skillEvalAgentStatusSchema,
});

export const skillEvalSuiteCaseSchema = z.object({
  expectedOutput: z.string().min(1).optional(),
  fixturePaths: z.array(z.string().min(1)),
  id: z.string().min(1),
  promptPreview: z.string().min(1),
  title: z.string().min(1).optional(),
});

export const skillEvalSuiteSchema = z.object({
  caseCount: z.number().int().nonnegative(),
  cases: z.array(skillEvalSuiteCaseSchema),
  evalPath: z.string().min(1).optional(),
  fingerprint: z.string().min(1).optional(),
  id: idSchema.optional(),
  skillId: idSchema,
  snapshotId: idSchema.optional(),
  status: skillEvalSuiteStatusSchema,
  syncTime: z.number().int().nonnegative().optional(),
  validationErrors: z.array(z.string()),
});

export const createSkillEvalRunInputSchema = z.object({
  agentId: idSchema,
  caseIds: z.array(z.string().min(1)).min(1).optional(),
  idempotencyKey: z.string().min(1).max(128).optional(),
  includeBaseline: z.boolean().optional(),
  skillId: idSchema,
  snapshotId: idSchema.optional(),
});

export const createSkillEvalRunOutputSchema = z.object({
  runId: idSchema,
  status: skillEvalRunStatusSchema,
});

export const skillEvalRunHistoryInputSchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  skillId: idSchema,
  snapshotId: idSchema.optional(),
});

export const skillEvalRunSummarySchema = z.object({
  blockedCases: z.number().int().nonnegative(),
  failedCases: z.number().int().nonnegative(),
  passedCases: z.number().int().nonnegative(),
  totalCases: z.number().int().nonnegative(),
});

export const skillEvalRunHistoryItemSchema = z.object({
  agent: z.object({
    displayName: z.string().min(1),
    id: idSchema,
    provider: z.string().min(1),
  }),
  completedAt: z.number().int().nonnegative().nullable(),
  createdAt: z.number().int().nonnegative(),
  id: idSchema,
  skillId: idSchema,
  snapshotId: idSchema.optional(),
  snapshotVersion: z.string().min(1).optional(),
  status: skillEvalRunStatusSchema,
  summary: skillEvalRunSummarySchema,
  syncTime: z.number().int().nonnegative(),
  tokenCount: z.number().int().nonnegative().optional(),
  totalDurationMs: z.number().int().nonnegative().optional(),
});

export const skillEvalRunHistoryOutputSchema = z.object({
  continueCursor: z.string(),
  isDone: z.boolean(),
  page: z.array(skillEvalRunHistoryItemSchema),
});

export const skillEvalModeResultSchema = z.object({
  artifacts: z.array(skillEvalArtifactSchema).optional(),
  durationMs: z.number().int().nonnegative().optional(),
  errorCode: z.string().min(1).optional(),
  errorMessage: z.string().min(1).optional(),
  exitCode: z.number().int().optional(),
  outputPreview: z.string().optional(),
  score: z.number().min(0).max(1).optional(),
  status: skillEvalCaseStatusSchema,
  tokenCount: z.number().int().nonnegative().optional(),
});

export const skillEvalCaseResultSchema = z.object({
  artifacts: z.array(skillEvalArtifactSchema),
  baseline: skillEvalModeResultSchema.nullable().optional(),
  caseId: z.string().min(1),
  id: idSchema,
  runId: idSchema,
  status: skillEvalCaseStatusSchema,
  summary: z.string().optional(),
  withSkill: skillEvalModeResultSchema,
});

export const skillEvalRunDetailInputSchema = z.object({
  runId: idSchema,
});

export const skillEvalRunDetailSchema = z.object({
  agent: z.object({
    displayName: z.string().min(1),
    id: idSchema,
    provider: z.string().min(1),
  }),
  artifactPrefix: z.string().min(1),
  caseResults: z.array(skillEvalCaseResultSchema),
  completedAt: z.number().int().nonnegative().nullable(),
  createdAt: z.number().int().nonnegative(),
  createdBy: idSchema.nullable().optional(),
  errorCode: z.string().min(1).optional(),
  errorMessage: z.string().min(1).optional(),
  id: idSchema,
  limits: skillEvalLimitsSchema,
  network: skillEvalNetworkPolicySchema,
  policyVersion: z.string().min(1),
  skillId: idSchema,
  snapshotId: idSchema.optional(),
  snapshotVersion: z.string().min(1).optional(),
  status: skillEvalRunStatusSchema,
  suiteId: idSchema.optional(),
  summary: skillEvalRunSummarySchema,
  syncTime: z.number().int().nonnegative(),
});

export const skillEvalStreamTokenInputSchema = z.object({
  runId: idSchema,
});

export const skillEvalStreamTokenOutputSchema = z.object({
  expiresAt: z.number().int().nonnegative(),
  token: z.string().min(1),
  url: z.string().min(1),
});

export const skillEvalRunEventKindSchema = z.enum([
  "status",
  "stdout",
  "stderr",
  "agent_message",
  "case_started",
  "case_finished",
  "artifact",
  "policy_block",
  "error",
  "summary",
]);

export const skillEvalRunEventSchema = z.object({
  caseId: z.string().min(1).optional(),
  eventId: z.string().min(1),
  kind: skillEvalRunEventKindSchema,
  message: z.string().optional(),
  payload: z.unknown().optional(),
  runId: idSchema,
  sequence: z.number().int().nonnegative(),
  syncTime: z.number().int().nonnegative(),
});

const listAgentsContract = baseContract
  .route({
    description: "Returns active sandbox agents available for skill eval runs.",
    method: "GET",
    path: "/skill-eval-sandbox/agents",
    tags: ["Skill Eval Sandbox"],
    successDescription: "Available sandbox agents",
    summary: "List skill eval sandbox agents",
  })
  .output(z.array(skillEvalAgentSchema));

const getSuiteContract = baseContract
  .route({
    description: "Returns eval suite availability and normalized case metadata for a skill.",
    method: "GET",
    path: "/skill-eval-sandbox/suite",
    tags: ["Skill Eval Sandbox"],
    successDescription: "Skill eval suite",
    summary: "Read skill eval suite",
  })
  .input(
    z.object({
      skillId: idSchema,
      snapshotId: idSchema.optional(),
    }),
  )
  .output(skillEvalSuiteSchema);

const createRunContract = baseContract
  .route({
    description: "Creates and enqueues an authenticated skill eval sandbox run.",
    method: "POST",
    path: "/skill-eval-sandbox/runs",
    tags: ["Skill Eval Sandbox"],
    successDescription: "Skill eval run created",
    summary: "Create skill eval sandbox run",
  })
  .input(createSkillEvalRunInputSchema)
  .output(createSkillEvalRunOutputSchema);

const listRunsBySkillContract = baseContract
  .route({
    description: "Returns historical eval sandbox runs for a skill.",
    method: "GET",
    path: "/skill-eval-sandbox/runs",
    tags: ["Skill Eval Sandbox"],
    successDescription: "Skill eval run history",
    summary: "List skill eval sandbox runs",
  })
  .input(skillEvalRunHistoryInputSchema)
  .output(skillEvalRunHistoryOutputSchema);

const getRunDetailContract = baseContract
  .route({
    description: "Returns detailed case results and safe artifact references for an eval run.",
    method: "GET",
    path: "/skill-eval-sandbox/runs/detail",
    tags: ["Skill Eval Sandbox"],
    successDescription: "Skill eval run detail",
    summary: "Read skill eval sandbox run detail",
  })
  .input(skillEvalRunDetailInputSchema)
  .output(skillEvalRunDetailSchema.nullable());

const createStreamTokenContract = baseContract
  .route({
    description: "Creates a short-lived token and URL for streaming eval run events.",
    method: "POST",
    path: "/skill-eval-sandbox/runs/stream-token",
    tags: ["Skill Eval Sandbox"],
    successDescription: "Skill eval stream token",
    summary: "Create skill eval sandbox stream token",
  })
  .input(skillEvalStreamTokenInputSchema)
  .output(skillEvalStreamTokenOutputSchema);

export const skillEvalSandboxContract = {
  createRun: createRunContract,
  createStreamToken: createStreamTokenContract,
  getRunDetail: getRunDetailContract,
  getSuite: getSuiteContract,
  listAgents: listAgentsContract,
  listRunsBySkill: listRunsBySkillContract,
} as const;

export type SkillEvalSandboxContract = typeof skillEvalSandboxContract;
