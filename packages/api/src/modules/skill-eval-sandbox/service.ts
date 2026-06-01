import type { z } from "zod";

import type {
  createSkillEvalRunInputSchema,
  createSkillEvalRunOutputSchema,
  skillEvalRunDetailInputSchema,
  skillEvalRunDetailSchema,
  skillEvalRunHistoryInputSchema,
  skillEvalRunHistoryOutputSchema,
  skillEvalStreamTokenInputSchema,
  skillEvalStreamTokenOutputSchema,
  skillEvalSuiteSchema,
} from "@skills-re/contract/skill-eval-sandbox";
import {
  skillEvalArtifactSchema,
  skillEvalAgentSchema,
  skillEvalLimitsSchema,
  skillEvalNetworkPolicySchema,
} from "@skills-re/contract/skill-eval-sandbox";
import type { SnapshotId } from "@skills-re/db/utils";
import { asSkillEvalRunId, asSkillId, asSnapshotId, createId } from "@skills-re/db/utils";
import { createDepGetter } from "../shared/deps";
import { decodeCursor, encodeCursor } from "../shared/pagination";
import type { SkillEvalRunScheduler } from "@skills-re/api/types";

import {
  createSkillEvalCaseFingerprint,
  createSkillEvalSuiteFingerprint,
  parseSkillEvalSuite,
  validateSkillEvalSuite,
} from "./parser";
import type { ParsedSkillEvalSuite, SkillEvalFixtureFile } from "./parser";
import type {
  listActiveAgents,
  SkillEvalSandboxAgentRow,
  StoredSkillEvalSuite,
  findRunByIdempotencyKey,
  getRunnableSkillById,
  getRunDetailById,
  insertRun,
  listCaseResultsByRun,
  listRunsBySkill,
  upsertSuiteWithCases,
} from "./repo";

type CreateRunInput = z.infer<typeof createSkillEvalRunInputSchema>;
type CreateRunOutput = z.infer<typeof createSkillEvalRunOutputSchema>;
type ListAgentsOutput = z.infer<typeof skillEvalAgentSchema>[];
type RunDetailInput = z.infer<typeof skillEvalRunDetailInputSchema>;
type RunDetailOutput = z.infer<typeof skillEvalRunDetailSchema>;
type RunHistoryInput = z.infer<typeof skillEvalRunHistoryInputSchema>;
type RunHistoryOutput = z.infer<typeof skillEvalRunHistoryOutputSchema>;
type StreamTokenInput = z.infer<typeof skillEvalStreamTokenInputSchema>;
type StreamTokenOutput = z.infer<typeof skillEvalStreamTokenOutputSchema>;
type SuiteOutput = z.infer<typeof skillEvalSuiteSchema>;

interface SnapshotForEvalSuite {
  directoryPath: string;
  id: SnapshotId;
  skillId: string;
  syncTime: number;
  version: string;
}

interface SnapshotFileForEvalSuite {
  contentType: string | null;
  fileHash: string;
  path: string;
  r2Key: string | null;
  size: number;
  sourceSha: string | null;
}

interface SnapshotFileContent {
  bytesRead: number;
  content: string;
  isTruncated: boolean;
  offset: number;
  totalBytes: number;
}

interface SkillEvalSandboxServiceDeps {
  findRunByIdempotencyKey: typeof findRunByIdempotencyKey;
  getRunDetailById: typeof getRunDetailById;
  getSnapshotById: (snapshotId: SnapshotId) => Promise<SnapshotForEvalSuite | null>;
  getRunnableSkillById: typeof getRunnableSkillById;
  insertRun: typeof insertRun;
  listCaseResultsByRun: typeof listCaseResultsByRun;
  listActiveAgents: typeof listActiveAgents;
  listRunsBySkill: typeof listRunsBySkill;
  listSnapshotFiles: (snapshotId: SnapshotId) => Promise<SnapshotFileForEvalSuite[]>;
  listSnapshotsPageBySkill: (input: { limit?: number; skillId: string }) => Promise<{
    isDone: boolean;
    nextCursor: unknown;
    page: SnapshotForEvalSuite[];
  }>;
  readSnapshotFileContent: (input: {
    maxBytes?: number;
    path: string;
    snapshotId: string;
  }) => Promise<SnapshotFileContent>;
  runScheduler: SkillEvalRunScheduler | null;
  upsertSuiteWithCases: typeof upsertSuiteWithCases;
}

interface CreateRunRuntimeDeps {
  runScheduler?: SkillEvalRunScheduler | null;
}

const createDefaultSkillEvalSandboxDeps = async (): Promise<SkillEvalSandboxServiceDeps> => {
  const [repo, snapshotsRepo, snapshotsService] = await Promise.all([
    import("./repo"),
    import("../snapshots/repo"),
    import("../snapshots/service"),
  ]);
  const service: SkillEvalSandboxServiceDeps = {
    findRunByIdempotencyKey: repo.findRunByIdempotencyKey,
    getRunDetailById: repo.getRunDetailById,
    getSnapshotById: async (snapshotId) => {
      const snapshot = await snapshotsRepo.getSnapshotById(snapshotId);
      return snapshot ? { ...snapshot, id: asSnapshotId(snapshot.id) } : null;
    },
    getRunnableSkillById: repo.getRunnableSkillById,
    insertRun: repo.insertRun,
    listCaseResultsByRun: repo.listCaseResultsByRun,
    listActiveAgents: repo.listActiveAgents,
    listRunsBySkill: repo.listRunsBySkill,
    listSnapshotFiles: snapshotsRepo.listSnapshotFiles,
    listSnapshotsPageBySkill: async (input) => {
      const page = await snapshotsRepo.listSnapshotsPageBySkill({
        limit: input.limit,
        skillId: asSkillId(input.skillId),
      });
      return {
        ...page,
        page: page.page.map((snapshot) => ({ ...snapshot, id: asSnapshotId(snapshot.id) })),
      };
    },
    readSnapshotFileContent: async (input) => await snapshotsService.readSnapshotFileContent(input),
    runScheduler: null,
    upsertSuiteWithCases: repo.upsertSuiteWithCases,
  };

  return service;
};

const notImplemented = (operation: string): never => {
  throw new Error(`Skill eval sandbox ${operation} is not implemented yet.`);
};

const EVAL_PATH = "evals/evals.json";
const POLICY_VERSION = "skill-eval-sandbox-v1";

const DEFAULT_SUITE_LIMITS = {
  maxCaseCount: 50,
  maxFixtureBytes: 5 * 1024 * 1024,
  maxFixtureCount: 20,
  maxPromptBytes: 20_000,
};

const DEFAULT_NETWORK_POLICY = {
  allowlist: [],
  blockMetadataEndpoints: true,
  blockPrivateRanges: true,
  maxBytes: 0,
  maxRequests: 0,
  mode: "deny" as const,
};

const parseJsonObject = (value: string): unknown => JSON.parse(value);

const toAgentOutput = (row: SkillEvalSandboxAgentRow): ListAgentsOutput[number] | null => {
  try {
    const parsed = skillEvalAgentSchema.safeParse({
      capabilities: parseJsonObject(row.capabilitiesJson),
      defaultLimits: parseJsonObject(row.defaultLimitsJson),
      description: row.description ?? undefined,
      displayName: row.displayName,
      id: row.id,
      provider: row.provider,
      runtimeFamily: row.runtimeFamily,
      sortOrder: row.sortOrder,
      status: row.status,
    });

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const normalizePath = (input: string) => {
  const segments = input
    .replaceAll("\\", "/")
    .trim()
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean);
  const stack: string[] = [];

  for (const segment of segments) {
    if (segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (stack.length > 0) {
        stack.pop();
      }
      continue;
    }
    stack.push(segment);
  }

  return stack.join("/");
};

const normalizeDirectoryPath = (input: string) => {
  const normalized = normalizePath(input);
  return normalized ? `${normalized}/` : "";
};

const toSkillRelativePath = (directoryPath: string, path: string) => {
  const normalizedPath = normalizePath(path);
  const normalizedDirectory = normalizeDirectoryPath(directoryPath);
  if (normalizedDirectory && normalizedPath.startsWith(normalizedDirectory)) {
    return normalizedPath.slice(normalizedDirectory.length);
  }
  return normalizedPath;
};

const toPromptPreview = (prompt: string) => {
  const compact = prompt.replaceAll(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
};

const toTimestamp = (value: Date | number) => (value instanceof Date ? value.getTime() : value);

const parseJsonWithFallback = (value: string, fallback: unknown): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseArtifacts = (value: string | null) => {
  if (!value) {
    return [];
  }
  const parsed = skillEvalArtifactSchema.array().safeParse(parseJsonWithFallback(value, []));
  return parsed.success ? parsed.data : [];
};

const truncatePreview = (value: string | null) => {
  if (value === null) {
    return;
  }
  return value.length > 4000 ? `${value.slice(0, 4000)}...` : value;
};

const toScore = (value: number | null) => {
  if (value === null) {
    return;
  }
  return value > 1 ? value / 100 : value;
};

const normalizeFixtureFiles = (
  snapshot: SnapshotForEvalSuite,
  files: SnapshotFileForEvalSuite[],
): SkillEvalFixtureFile[] =>
  files.map((file) => ({
    path: toSkillRelativePath(snapshot.directoryPath, file.path),
    size: file.size,
  }));

const toSuiteOutput = (suite: StoredSkillEvalSuite): SuiteOutput => ({
  caseCount: suite.caseCount,
  cases: suite.cases.map((caseItem) => ({
    expectedOutput: caseItem.expectedOutput ?? undefined,
    fixturePaths: caseItem.fixturePaths,
    id: caseItem.caseId,
    promptPreview: caseItem.promptPreview,
    title: caseItem.title ?? undefined,
  })),
  evalPath: suite.evalPath,
  fingerprint: suite.fingerprint,
  id: suite.id,
  skillId: suite.skillId,
  snapshotId: suite.snapshotId,
  status: suite.status,
  syncTime: suite.syncTime,
  validationErrors: suite.validationErrors,
});

const isMissingEvalFileError = (error: unknown) =>
  error instanceof Error && /file not found|not found in snapshot/i.test(error.message);

const persistMissingSuite = async (input: {
  snapshot: SnapshotForEvalSuite;
  skillId: string;
  upsertSuiteWithCasesFn: SkillEvalSandboxServiceDeps["upsertSuiteWithCases"];
}) => {
  const suite = await input.upsertSuiteWithCasesFn({
    caseCount: 0,
    cases: [],
    evalPath: EVAL_PATH,
    fingerprint: `missing:${input.snapshot.id}`,
    skillId: input.skillId,
    snapshotId: input.snapshot.id,
    status: "missing",
    validationErrors: [`${EVAL_PATH} was not found in this snapshot`],
  });
  return toSuiteOutput(suite);
};

const persistInvalidSuite = async (input: {
  error: unknown;
  snapshot: SnapshotForEvalSuite;
  skillId: string;
  upsertSuiteWithCasesFn: SkillEvalSandboxServiceDeps["upsertSuiteWithCases"];
}) => {
  const message = input.error instanceof Error ? input.error.message : "invalid eval suite";
  const suite = await input.upsertSuiteWithCasesFn({
    caseCount: 0,
    cases: [],
    evalPath: EVAL_PATH,
    fingerprint: `invalid:${input.snapshot.id}`,
    skillId: input.skillId,
    snapshotId: input.snapshot.id,
    status: "invalid",
    validationErrors: [message],
  });
  return toSuiteOutput(suite);
};

const persistParsedSuite = async (input: {
  files: SnapshotFileForEvalSuite[];
  parsedSuite: ParsedSkillEvalSuite;
  snapshot: SnapshotForEvalSuite;
  skillId: string;
  upsertSuiteWithCasesFn: SkillEvalSandboxServiceDeps["upsertSuiteWithCases"];
}) => {
  const validation = validateSkillEvalSuite({
    files: normalizeFixtureFiles(input.snapshot, input.files),
    limits: DEFAULT_SUITE_LIMITS,
    suite: input.parsedSuite,
  });
  const [suiteFingerprint, caseFingerprints] = await Promise.all([
    createSkillEvalSuiteFingerprint({
      snapshotId: input.snapshot.id,
      snapshotVersion: input.snapshot.version,
      suite: input.parsedSuite,
    }),
    Promise.all(
      input.parsedSuite.cases.map((caseItem) =>
        createSkillEvalCaseFingerprint({
          caseItem,
          snapshotId: input.snapshot.id,
          snapshotVersion: input.snapshot.version,
        }),
      ),
    ),
  ]);
  const suite = await input.upsertSuiteWithCasesFn({
    caseCount: input.parsedSuite.caseCount,
    cases: input.parsedSuite.cases.map((caseItem, index) => ({
      assertions: caseItem.assertions,
      caseId: caseItem.id,
      expectedOutput: caseItem.expectedOutput ?? null,
      fingerprint: caseFingerprints[index] ?? "",
      fixturePaths: caseItem.fixturePaths,
      prompt: caseItem.prompt,
      promptPreview: toPromptPreview(caseItem.prompt),
      sortOrder: index,
      title: caseItem.title ?? null,
    })),
    evalPath: EVAL_PATH,
    fingerprint: suiteFingerprint,
    skillId: input.skillId,
    snapshotId: input.snapshot.id,
    status: validation.valid ? "valid" : "invalid",
    validationErrors: validation.errors,
  });
  return toSuiteOutput(suite);
};

export const createSkillEvalSandboxService = (
  overrides: Partial<SkillEvalSandboxServiceDeps> = {},
) => {
  let defaultDepsPromise: Promise<SkillEvalSandboxServiceDeps> | null = null;

  const getDefaultDeps = async () => {
    defaultDepsPromise ??= createDefaultSkillEvalSandboxDeps();
    return await defaultDepsPromise;
  };

  const getDep = createDepGetter(overrides, getDefaultDeps);

  const service = {
    async createRun(
      input: CreateRunInput,
      auth: { userId: string },
      runtimeDeps: CreateRunRuntimeDeps = {},
    ): Promise<CreateRunOutput> {
      if (!auth.userId) {
        throw new Error("Authentication required.");
      }

      if (input.idempotencyKey) {
        const findRunByIdempotencyKeyFn = await getDep("findRunByIdempotencyKey");
        const existingRun = await findRunByIdempotencyKeyFn(input.idempotencyKey, auth.userId);
        if (existingRun) {
          return {
            runId: existingRun.id,
            status: existingRun.status,
          };
        }
      }

      const [getRunnableSkillByIdFn, listActiveAgentsFn, runScheduler] = await Promise.all([
        getDep("getRunnableSkillById"),
        getDep("listActiveAgents"),
        getDep("runScheduler"),
      ]);
      const scheduler = runtimeDeps.runScheduler ?? runScheduler;
      if (!scheduler) {
        throw new Error("Skill eval run scheduler is not configured.");
      }

      const skill = await getRunnableSkillByIdFn(input.skillId);
      if (!skill || skill.visibility !== "public") {
        throw new Error("Skill is not publicly runnable.");
      }

      const agentRows = await listActiveAgentsFn();
      const agent = agentRows
        .map((row) => toAgentOutput(row))
        .find((item) => item?.id === input.agentId);
      if (!agent) {
        throw new Error("Sandbox agent is not active or configured.");
      }

      const suite = await service.getSuite({
        skillId: input.skillId,
        snapshotId: input.snapshotId ?? skill.latestSnapshotId ?? undefined,
      });
      if (suite.status !== "valid" || !suite.id || !suite.snapshotId) {
        throw new Error("Skill eval suite is not runnable.");
      }

      const selectedCaseIds = input.caseIds ?? suite.cases.map((caseItem) => caseItem.id);
      const availableCaseIds = new Set(suite.cases.map((caseItem) => caseItem.id));
      const unknownCaseIds = selectedCaseIds.filter((caseId) => !availableCaseIds.has(caseId));
      if (unknownCaseIds.length > 0) {
        throw new Error(`Unknown eval case ids: ${unknownCaseIds.join(", ")}`);
      }

      const runId = asSkillEvalRunId(createId());
      const insertRunFn = await getDep("insertRun");
      const run = await insertRunFn({
        agentId: input.agentId,
        artifactPrefix: `eval-runs/${runId}`,
        createdBy: auth.userId,
        id: runId,
        idempotencyKey: input.idempotencyKey,
        limits: agent.defaultLimits,
        network: DEFAULT_NETWORK_POLICY,
        policyVersion: POLICY_VERSION,
        skillId: input.skillId,
        snapshotId: asSnapshotId(suite.snapshotId),
        status: "pending",
        suiteId: suite.id,
        totalCases: selectedCaseIds.length,
      });
      await scheduler.enqueue({
        includeBaseline: input.includeBaseline ?? false,
        runId: run.id,
      });

      return {
        runId: run.id,
        status: run.status,
      };
    },

    async createStreamToken(
      _input: StreamTokenInput,
      _auth: { userId: string },
    ): Promise<StreamTokenOutput> {
      return await notImplemented("stream token creation");
    },

    async getRunDetail(input: RunDetailInput): Promise<RunDetailOutput | null> {
      const [getRunDetailByIdFn, listCaseResultsByRunFn] = await Promise.all([
        getDep("getRunDetailById"),
        getDep("listCaseResultsByRun"),
      ]);
      const run = await getRunDetailByIdFn(asSkillEvalRunId(input.runId));
      if (!run) {
        return null;
      }

      const limits = skillEvalLimitsSchema.parse(
        parseJsonWithFallback(run.limitsJson, DEFAULT_SUITE_LIMITS),
      );
      const network = skillEvalNetworkPolicySchema.parse(
        parseJsonWithFallback(run.networkJson, DEFAULT_NETWORK_POLICY),
      );
      const caseRows = await listCaseResultsByRunFn(run.id);

      return {
        agent: {
          displayName: run.agentDisplayName,
          id: run.agentId,
          provider: run.agentProvider,
        },
        artifactPrefix: run.artifactPrefix,
        caseResults: caseRows.map((caseResult) => {
          const withSkillArtifacts = parseArtifacts(caseResult.withSkillArtifactsJson);
          const baselineArtifacts = parseArtifacts(caseResult.baselineArtifactsJson);
          return {
            artifacts: withSkillArtifacts,
            baseline: caseResult.baselineStatus
              ? {
                  artifacts: baselineArtifacts,
                  durationMs: caseResult.baselineDurationMs ?? undefined,
                  errorCode: caseResult.baselineErrorCode ?? undefined,
                  errorMessage: caseResult.baselineErrorMessage ?? undefined,
                  exitCode: caseResult.baselineExitCode ?? undefined,
                  outputPreview: truncatePreview(caseResult.baselineOutputPreview),
                  score: toScore(caseResult.baselineScore),
                  status: caseResult.baselineStatus,
                  tokenCount: caseResult.baselineTokenCount ?? undefined,
                }
              : null,
            caseId: caseResult.caseId,
            id: caseResult.id,
            runId: caseResult.runId,
            status: caseResult.status,
            summary: caseResult.summary ?? undefined,
            withSkill: {
              artifacts: withSkillArtifacts,
              durationMs: caseResult.withSkillDurationMs ?? undefined,
              errorCode: caseResult.withSkillErrorCode ?? undefined,
              errorMessage: caseResult.withSkillErrorMessage ?? undefined,
              exitCode: caseResult.withSkillExitCode ?? undefined,
              outputPreview: truncatePreview(caseResult.withSkillOutputPreview),
              score: toScore(caseResult.withSkillScore),
              status: caseResult.withSkillStatus,
              tokenCount: caseResult.withSkillTokenCount ?? undefined,
            },
          };
        }),
        completedAt: run.completedAt,
        createdAt: toTimestamp(run.createdAt),
        createdBy: run.createdBy,
        errorCode: run.errorCode ?? undefined,
        errorMessage: run.errorMessage ?? undefined,
        id: run.id,
        limits,
        network,
        policyVersion: run.policyVersion,
        skillId: run.skillId,
        snapshotId: run.snapshotId,
        snapshotVersion: run.snapshotVersion,
        status: run.status,
        suiteId: run.suiteId,
        summary: {
          blockedCases: run.blockedCases,
          failedCases: run.failedCases,
          passedCases: run.passedCases,
          totalCases: run.totalCases,
        },
        syncTime: run.syncTime,
      };
    },

    async getSuite(input: { skillId: string; snapshotId?: string }): Promise<SuiteOutput> {
      const [getSnapshotById, readSnapshotFileContent] = await Promise.all([
        getDep("getSnapshotById"),
        getDep("readSnapshotFileContent"),
      ]);
      let snapshot: SnapshotForEvalSuite | null;
      if (input.snapshotId) {
        snapshot = await getSnapshotById(asSnapshotId(input.snapshotId));
      } else {
        const listSnapshotsPageBySkill = await getDep("listSnapshotsPageBySkill");
        const snapshotFromList = await listSnapshotsPageBySkill({
          limit: 1,
          skillId: input.skillId,
        });
        snapshot = snapshotFromList.page[0] ?? null;
      }

      if (!snapshot || snapshot.skillId !== input.skillId) {
        return {
          caseCount: 0,
          cases: [],
          skillId: input.skillId,
          snapshotId: input.snapshotId,
          status: "missing",
          validationErrors: [],
        };
      }

      const upsertSuiteWithCasesFn = await getDep("upsertSuiteWithCases");
      let content: SnapshotFileContent;
      try {
        content = await readSnapshotFileContent({
          maxBytes: DEFAULT_SUITE_LIMITS.maxPromptBytes * DEFAULT_SUITE_LIMITS.maxCaseCount,
          path: EVAL_PATH,
          snapshotId: snapshot.id,
        });
      } catch (error) {
        if (isMissingEvalFileError(error)) {
          return await persistMissingSuite({
            snapshot,
            skillId: input.skillId,
            upsertSuiteWithCasesFn,
          });
        }
        throw error;
      }

      let parsedSuite: ParsedSkillEvalSuite;
      try {
        parsedSuite = parseSkillEvalSuite(content.content);
      } catch (error) {
        return await persistInvalidSuite({
          error,
          snapshot,
          skillId: input.skillId,
          upsertSuiteWithCasesFn,
        });
      }

      const listSnapshotFiles = await getDep("listSnapshotFiles");
      const files = await listSnapshotFiles(snapshot.id);
      return await persistParsedSuite({
        files,
        parsedSuite,
        snapshot,
        skillId: input.skillId,
        upsertSuiteWithCasesFn,
      });
    },

    async listAgents(): Promise<ListAgentsOutput> {
      const listActiveAgentsFn = await getDep("listActiveAgents");
      const rows = await listActiveAgentsFn();
      return rows.flatMap((row) => {
        const agent = toAgentOutput(row);
        return agent ? [agent] : [];
      });
    },

    async listRunsBySkill(input: RunHistoryInput): Promise<RunHistoryOutput> {
      const listRunsBySkillFn = await getDep("listRunsBySkill");
      const page = await listRunsBySkillFn({
        cursor: decodeCursor(input.cursor),
        limit: input.limit,
        skillId: input.skillId,
        snapshotId: input.snapshotId,
      });
      return {
        continueCursor: encodeCursor(page.nextCursor),
        isDone: page.isDone,
        page: page.page.map((run) => ({
          agent: {
            displayName: run.agentDisplayName,
            id: run.agentId,
            provider: run.agentProvider,
          },
          completedAt: run.completedAt,
          createdAt: toTimestamp(run.createdAt),
          id: run.id,
          skillId: run.skillId,
          snapshotId: run.snapshotId,
          snapshotVersion: run.snapshotVersion,
          status: run.status,
          summary: {
            blockedCases: run.blockedCases,
            failedCases: run.failedCases,
            passedCases: run.passedCases,
            totalCases: run.totalCases,
          },
          syncTime: run.syncTime,
          tokenCount: run.tokenCount ?? undefined,
          totalDurationMs: run.totalDurationMs ?? undefined,
        })),
      };
    },
  };

  return service;
};

export const skillEvalSandboxService = createSkillEvalSandboxService();
