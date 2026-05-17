/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity lint/performance/useTopLevelRegex lint/suspicious/noConsole: audit script */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as setTimeoutP } from "node:timers/promises";

import {
  getAuditTargetCheckoutArgs,
  getAuditTargetFetchArgs,
} from "../../packages/api/src/modules/static-audits/git-checkout";
import type { StaticAuditReport } from "../../packages/contract/src/static-audits";
import { staticAuditReportSchema } from "../../packages/contract/src/static-audits";
import type { SarifLog } from "../../packages/api/src/modules/static-audits/skill-scanner";
import { parseSkillScannerSarif } from "../../packages/api/src/modules/static-audits/skill-scanner";

import { renderAuditMarkdown } from "./render-audit-md";
import { scoreAuditFindings } from "./score-audit";
import type {
  AuditFailedIndexItem,
  AuditIndexItem,
  AuditIndexPayload,
  AuditTargetRecord,
  StaticAuditFinding,
} from "./types";

const DEFAULT_TARGETS_PATH = path.join(
  "review-runs",
  "latest",
  "audits",
  "skill-scanner",
  "targets.json",
);
const DEFAULT_OUTPUT_DIR = path.join("review-runs", "latest", "audits", "skill-scanner");
const DEFAULT_POLICY = process.env.SKILL_SCANNER_POLICY?.trim() || "balanced";
const DEFAULT_PIPELINE = "github-actions";
const DEFAULT_PIPELINE_RUN_ID = "local";
const DEFAULT_RULES_VERSION = `skill-scanner:${DEFAULT_POLICY}`;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_LLM_MODEL_ROTATION = [
  "gemini/gemini-3.1-flash-lite",
  "gemini/gemini-2.5-flash-lite",
  "gemini/gemini-2.5-flash",
] as const;
const MODEL_UNAVAILABLE_ERROR_HINTS = [
  "404",
  "deprecated",
  "deprecation",
  "model not found",
  "model is not found",
  "model unavailable",
  "not available",
  "shut down",
  "unsupported model",
  "withdrawn",
] as const;
const RATE_LIMIT_ERROR_HINTS = [
  "429",
  "capacity",
  "daily limit",
  "quota",
  "rate limit",
  "resource exhausted",
  "too many requests",
] as const;

interface ExecResult {
  code: number;
  stderr: string;
  stdout: string;
}

const normalizePath = (value: string) => value.replaceAll("\\", "/");
const toRelative = (baseDir: string, absolutePath: string) =>
  normalizePath(path.relative(baseDir, absolutePath));
const shortHash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 12);
const countLines = (content: string) => content.split(/\r\n|\r|\n/).length;

const readJsonFile = async <T>(filePath: string) =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as T;

const parseCommaSeparatedList = (value?: string) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0) ?? [];

const normalizeOptionalString = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const logVerbose = (enabled: boolean, message: string) => {
  if (!enabled) {
    return;
  }
  console.log(`[audit:verbose] ${message}`);
};

const isCommandNotFoundError = (error: unknown, command: string): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const asError = error as NodeJS.ErrnoException;
  if (asError.code !== "ENOENT") {
    return false;
  }

  return asError.path === command || asError.syscall?.includes(command) === true;
};

const parseBooleanFlag = (value: string | undefined, defaultValue: boolean) => {
  if (!value) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return defaultValue;
};

const parseIntegerFlag = (value: string | undefined, defaultValue: number) => {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const buildLlmModelRotation = (input?: { configuredModel?: string }) => {
  const configuredModels = parseCommaSeparatedList(process.env.SKILL_SCANNER_LLM_MODEL_ROTATION);
  const seedModels = [
    ...DEFAULT_LLM_MODEL_ROTATION,
    ...(configuredModels.length > 0 ? configuredModels : []),
    ...(input?.configuredModel ? [input.configuredModel] : []),
  ];

  const seen = new Set<string>();
  const rotation: string[] = [];
  for (const model of seedModels) {
    const normalized = model.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    rotation.push(normalized);
  }

  return rotation;
};

const getErrorText = (error: unknown) =>
  [
    error instanceof Error ? error.message : String(error),
    error instanceof Error ? error.stack : "",
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

const isRetryableModelError = (error: unknown) => {
  const text = getErrorText(error);
  return [...RATE_LIMIT_ERROR_HINTS, ...MODEL_UNAVAILABLE_ERROR_HINTS].some((hint) =>
    text.includes(hint),
  );
};

const normalizeToken = (value: string): string => value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");

const extractPathHintsFromSourceUrl = (
  target: AuditTargetRecord,
): {
  githubTreePath?: string;
  skillSlug?: string;
} => {
  const sourceUrl = target.sourceUrl?.trim();
  if (!sourceUrl) {
    return {};
  }

  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();
    const segments = url.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    if (host === "github.com" || host === "www.github.com") {
      if (segments.length >= 5 && segments[2] === "tree") {
        const [owner, repo] = segments;
        if (
          owner?.toLowerCase() === target.owner.toLowerCase() &&
          repo?.toLowerCase() === target.repo.toLowerCase()
        ) {
          const githubTreePath = normalizePath(segments.slice(4).join("/"));
          if (githubTreePath.length > 0) {
            return { githubTreePath };
          }
        }
      }
      return {};
    }

    if ((host === "skills.sh" || host === "www.skills.sh") && segments.length >= 3) {
      return { skillSlug: segments[2] };
    }
  } catch {
    return {};
  }

  return {};
};

const listSkillMarkdownDirectories = async (repoDir: string): Promise<string[]> => {
  const queue: string[] = [repoDir];
  const found = new Set<string>();

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") {
          continue;
        }
        queue.push(nextPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      if (entry.name.toLowerCase() !== "skill.md") {
        continue;
      }

      const parentPath = path.dirname(nextPath);
      const relativeParent = normalizePath(path.relative(repoDir, parentPath));
      found.add(relativeParent === "." ? "" : relativeParent);
    }
  }

  return [...found].toSorted((left, right) => left.localeCompare(right));
};

const resolveSkillRootPathFromRepo = async (
  repoDir: string,
  target: AuditTargetRecord,
  verbose: boolean,
): Promise<string | undefined> => {
  const hints = extractPathHintsFromSourceUrl(target);
  const markdownDirs = await listSkillMarkdownDirectories(repoDir);

  if (markdownDirs.length === 0) {
    return undefined;
  }

  const directSkillRootPath = normalizePath(target.skillRootPath ?? "");
  if (directSkillRootPath.length > 0) {
    const matched = markdownDirs.find(
      (dir) => dir.toLowerCase() === directSkillRootPath.toLowerCase(),
    );
    if (matched !== undefined) {
      return matched;
    }
  }

  if (hints.githubTreePath) {
    const hintPath = normalizePath(hints.githubTreePath);
    const matched = markdownDirs.find((dir) => dir.toLowerCase() === hintPath.toLowerCase());
    if (matched !== undefined) {
      return matched;
    }
  }

  if (hints.skillSlug) {
    const slugToken = normalizeToken(hints.skillSlug);
    const candidates = markdownDirs.filter((dir) => {
      const base = path.basename(dir || ".");
      return normalizeToken(base) === slugToken;
    });
    if (candidates.length > 0) {
      return candidates.toSorted(
        (left, right) => left.length - right.length || left.localeCompare(right),
      )[0];
    }
  }

  if (markdownDirs.length === 1) {
    return markdownDirs[0];
  }

  logVerbose(
    verbose,
    `could not uniquely resolve skill path from sourceUrl=${target.sourceUrl ?? "n/a"}; candidates=${markdownDirs.join(", ")}`,
  );
  return undefined;
};

const runCommand = async (
  command: string,
  args: string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
    verbose?: boolean;
  },
): Promise<ExecResult> =>
  // eslint-disable-next-line promise/avoid-new
  await new Promise<ExecResult>((resolve, reject) => {
    const commandLine = [command, ...args].join(" ");
    logVerbose(options.verbose ?? false, `exec: ${commandLine}`);
    logVerbose(options.verbose ?? false, `cwd: ${options.cwd}`);

    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", (error) => reject(error));

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({
        code: 124,
        stderr: `${stderr}\nTimed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`,
        stdout,
      });
    }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        code: code ?? 1,
        stderr,
        stdout,
      });
    });
  });

const runGit = async (
  gitArgs: readonly string[],
  options: { cwd: string; verbose: boolean },
  errorLabel: string,
) => {
  const result = await runCommand("git", [...gitArgs], options);
  if (result.code !== 0) {
    throw new Error(`${errorLabel}: ${result.stderr || result.stdout}`);
  }
  return result;
};

const doSparseCheckout = async (input: {
  commitSha: string | undefined;
  paths: string[];
  repoDir: string;
  verbose: boolean;
}) => {
  await runGit(
    ["sparse-checkout", "set", ...input.paths],
    { cwd: input.repoDir, verbose: input.verbose },
    "git sparse-checkout set failed",
  );
  await runGit(
    getAuditTargetCheckoutArgs(input.commitSha),
    { cwd: input.repoDir, verbose: input.verbose },
    "git checkout failed",
  );
};

const findSkillMdPathsInTree = async (
  repoDir: string,
  treeRef: string,
  verbose: boolean,
): Promise<string[]> => {
  const result = await runCommand("git", ["ls-tree", "-r", treeRef, "--name-only"], {
    cwd: repoDir,
    verbose,
  });
  if (result.code !== 0) {
    return [];
  }
  return result.stdout
    .split("\n")
    .map((line) => normalizePath(line.trim()))
    .filter((line) => line.length > 0 && path.basename(line).toLowerCase() === "skill.md");
};

const cloneAuditTargetRepo = async (input: {
  target: AuditTargetRecord;
  workspaceDir: string;
  repoDir: string;
  verbose: boolean;
}): Promise<{
  resolvedSkillRootPath: string;
}> => {
  const repoUrl = `https://github.com/${input.target.owner}/${input.target.repo}.git`;
  await runGit(
    [
      "clone",
      "--no-checkout",
      "--depth",
      "1",
      "--filter=blob:none",
      "--sparse",
      repoUrl,
      input.repoDir,
    ],
    { cwd: input.workspaceDir, verbose: input.verbose },
    "git clone failed",
  );

  const fetchRevisionArgs = getAuditTargetFetchArgs(input.target.sourceCommitSha);
  if (fetchRevisionArgs) {
    await runGit(
      fetchRevisionArgs,
      { cwd: input.repoDir, verbose: input.verbose },
      "git fetch revision failed",
    );
  }

  const normalizedSkillRootPath = normalizePath(input.target.skillRootPath ?? "");
  const sourceHints = extractPathHintsFromSourceUrl(input.target);
  const firstPathHint = normalizedSkillRootPath || normalizePath(sourceHints.githubTreePath ?? "");

  if (firstPathHint.length > 0) {
    await doSparseCheckout({
      commitSha: input.target.sourceCommitSha,
      paths: [firstPathHint],
      repoDir: input.repoDir,
      verbose: input.verbose,
    });
    return { resolvedSkillRootPath: firstPathHint };
  }

  const treeRef = input.target.sourceCommitSha ?? "HEAD";
  const skillMdPaths = await findSkillMdPathsInTree(input.repoDir, treeRef, input.verbose);
  if (skillMdPaths.length === 0) {
    throw new Error(
      `skill root path could not be resolved for ${input.target.owner}/${input.target.repo}: no SKILL.md found at expected locations`,
    );
  }

  await runGit(
    ["sparse-checkout", "set", "--no-cone", ...skillMdPaths],
    { cwd: input.repoDir, verbose: input.verbose },
    "git sparse-checkout set markdown failed",
  );
  await runGit(
    getAuditTargetCheckoutArgs(input.target.sourceCommitSha),
    { cwd: input.repoDir, verbose: input.verbose },
    "git checkout failed",
  );

  const resolvedSkillRootPath = await resolveSkillRootPathFromRepo(
    input.repoDir,
    input.target,
    input.verbose,
  );
  if (resolvedSkillRootPath && resolvedSkillRootPath.length > 0) {
    await doSparseCheckout({
      commitSha: input.target.sourceCommitSha,
      paths: [resolvedSkillRootPath],
      repoDir: input.repoDir,
      verbose: input.verbose,
    });
    return { resolvedSkillRootPath };
  }

  throw new Error(
    `skill root path could not be resolved for ${input.target.owner}/${input.target.repo}: no SKILL.md found at expected locations`,
  );
};

const computeSourceHash = async (repoDir: string, scanDir: string, verbose: boolean) => {
  const result = await runCommand("git", ["rev-parse", "HEAD"], {
    cwd: repoDir,
    verbose,
  });
  if (result.code === 0) {
    return result.stdout.trim();
  }

  const hasher = createHash("sha256");
  const queue: string[] = [scanDir];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }
    const entries = await fs.readdir(current, { withFileTypes: true });
    const sortedEntries = entries.toSorted((left, right) => left.name.localeCompare(right.name));
    for (const entry of sortedEntries) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") {
          continue;
        }
        queue.push(nextPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const content = await fs.readFile(nextPath);
      hasher.update(toRelative(scanDir, nextPath));
      hasher.update(content);
    }
  }
  return hasher.digest("hex");
};

const scanFileStats = async (scanDir: string) => {
  let filesScanned = 0;
  let totalLines = 0;
  const queue: string[] = [scanDir];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") {
          continue;
        }
        queue.push(nextPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      filesScanned += 1;
      try {
        const content = await fs.readFile(nextPath, "utf-8");
        totalLines += countLines(content);
      } catch {
        // Ignore binary and unreadable files.
      }
    }
  }

  return { filesScanned, totalLines };
};

const writeAuditOutput = async (input: {
  outputDir: string;
  report: StaticAuditReport;
  target: AuditTargetRecord;
}) => {
  const directoryHash = shortHash(input.target.skillRootPath ?? "root");
  const artifactDir = path.join(
    input.outputDir,
    `${input.target.owner.toLowerCase()}__${input.target.repo.toLowerCase()}__${directoryHash}`,
  );
  await fs.mkdir(artifactDir, { recursive: true });

  const markdown = renderAuditMarkdown(input.report);
  const reportWithMarkdown: StaticAuditReport = {
    ...input.report,
    artifacts: {
      ...input.report.artifacts,
      report_markdown: markdown,
    },
  };

  const auditJsonPath = path.join(artifactDir, "audit.json");
  const auditMdPath = path.join(artifactDir, "audit.md");
  await fs.writeFile(auditJsonPath, `${JSON.stringify(reportWithMarkdown, null, 2)}\n`, "utf-8");
  await fs.writeFile(auditMdPath, `${markdown}\n`, "utf-8");

  return {
    artifactDir,
    auditJsonPath,
    auditMdPath,
    report: reportWithMarkdown,
  };
};

const summarizeFindings = (findings: StaticAuditFinding[]) => {
  if (findings.length === 0) {
    return "No skill-scanner findings detected.";
  }

  const [highestSeverity] = findings
    .map((finding) => finding.severity)
    .toSorted((left, right) => {
      const rank: Record<StaticAuditFinding["severity"], number> = {
        critical: 4,
        high: 3,
        low: 1,
        medium: 2,
      };
      return rank[right] - rank[left];
    });

  return `${findings.length} skill-scanner finding(s) detected. Highest severity: ${highestSeverity}.`;
};

interface ParseState {
  delayMsBetweenTargets: number;
  failOnBlock: boolean;
  llmConsensusRuns: number;
  llmModel: string | undefined;
  llmProvider: string | undefined;
  outputDir: string;
  pipeline: string;
  pipelineRunId: string;
  policy: string;
  rulesVersion: string;
  targetsPath: string;
  useBehavioral: boolean;
  useLlm: boolean;
  useMeta: boolean;
  useTrigger: boolean;
  useVirusTotal: boolean;
  verbose: boolean;
  vtUploadFiles: boolean;
}

const applyLlmStringArg = (arg: string, next: string | undefined, state: ParseState): boolean => {
  if (arg === "--llm-provider") {
    state.llmProvider = normalizeOptionalString(next) ?? state.llmProvider;
    return true;
  }
  if (arg === "--llm-model") {
    state.llmModel = normalizeOptionalString(next) ?? state.llmModel;
    return true;
  }
  if (arg === "--llm-consensus-runs") {
    state.llmConsensusRuns = parseIntegerFlag(next, state.llmConsensusRuns);
    return true;
  }
  return false;
};

const applyStringArg = (arg: string, next: string | undefined, state: ParseState): boolean => {
  if (arg === "--targets") {
    state.targetsPath = next ?? state.targetsPath;
    return true;
  }
  if (arg === "--output-dir") {
    state.outputDir = next ?? state.outputDir;
    return true;
  }
  if (arg === "--rules-version") {
    state.rulesVersion = next ?? state.rulesVersion;
    return true;
  }
  if (arg === "--pipeline") {
    state.pipeline = next ?? state.pipeline;
    return true;
  }
  if (arg === "--pipeline-run-id") {
    state.pipelineRunId = next ?? state.pipelineRunId;
    return true;
  }
  if (arg === "--policy") {
    state.policy = normalizeOptionalString(next) ?? state.policy;
    return true;
  }
  if (arg === "--delay-ms-between-targets") {
    state.delayMsBetweenTargets = parseIntegerFlag(next, state.delayMsBetweenTargets);
    return true;
  }
  if (arg === "--fail-on-block") {
    state.failOnBlock = (next ?? "true").toLowerCase() !== "false";
    return true;
  }
  return applyLlmStringArg(arg, next, state);
};

const applyFlagArg = (arg: string, state: ParseState): void => {
  if (arg === "--verbose" || arg === "-v") {
    state.verbose = true;
    return;
  }
  if (arg === "--use-llm") {
    state.useLlm = true;
    return;
  }
  if (arg === "--enable-meta") {
    state.useMeta = true;
    return;
  }
  if (arg === "--use-trigger") {
    state.useTrigger = true;
    return;
  }
  if (arg === "--use-behavioral") {
    state.useBehavioral = true;
    return;
  }
  if (arg === "--use-virustotal") {
    state.useVirusTotal = true;
    return;
  }
  if (arg === "--vt-upload-files") {
    state.vtUploadFiles = true;
  }
};

const parseArgs = (argv: string[]): ParseState => {
  const hasLlmApiKey = Boolean(process.env.SKILL_SCANNER_LLM_API_KEY?.trim());
  const state: ParseState = {
    delayMsBetweenTargets: parseIntegerFlag(process.env.SKILL_SCANNER_DELAY_MS, 0),
    failOnBlock: true,
    llmConsensusRuns: parseIntegerFlag(process.env.SKILL_SCANNER_LLM_CONSENSUS_RUNS, 1),
    llmModel: normalizeOptionalString(process.env.SKILL_SCANNER_LLM_MODEL),
    llmProvider: normalizeOptionalString(process.env.SKILL_SCANNER_LLM_PROVIDER),
    outputDir: DEFAULT_OUTPUT_DIR,
    pipeline: process.env.GITHUB_ACTIONS ? "github-actions-pr" : DEFAULT_PIPELINE,
    pipelineRunId: process.env.GITHUB_RUN_ID ?? DEFAULT_PIPELINE_RUN_ID,
    policy: DEFAULT_POLICY,
    rulesVersion: DEFAULT_RULES_VERSION,
    targetsPath: DEFAULT_TARGETS_PATH,
    useBehavioral: parseBooleanFlag(process.env.SKILL_SCANNER_USE_BEHAVIORAL, true),
    useLlm: parseBooleanFlag(process.env.SKILL_SCANNER_ENABLE_LLM, hasLlmApiKey),
    useMeta: parseBooleanFlag(process.env.SKILL_SCANNER_ENABLE_META, hasLlmApiKey),
    useTrigger: parseBooleanFlag(process.env.SKILL_SCANNER_USE_TRIGGER, true),
    useVirusTotal: parseBooleanFlag(
      process.env.SKILL_SCANNER_ENABLE_VIRUSTOTAL,
      Boolean(process.env.VIRUSTOTAL_API_KEY?.trim()),
    ),
    verbose:
      process.env.AUDIT_VERBOSE === "1" || process.env.AUDIT_VERBOSE?.toLowerCase() === "true",
    vtUploadFiles: parseBooleanFlag(process.env.SKILL_SCANNER_VT_UPLOAD_FILES, false),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";
    if (applyStringArg(arg, argv[index + 1], state)) {
      index += 1;
    } else {
      applyFlagArg(arg, state);
    }
  }

  return state;
};

const resolveSkillScannerVersion = async (verbose: boolean) => {
  try {
    const version = await runCommand("skill-scanner", ["--version"], {
      cwd: process.cwd(),
      verbose,
    });
    if (version.code === 0) {
      return version.stdout.trim() || version.stderr.trim() || undefined;
    }
  } catch (error) {
    if (isCommandNotFoundError(error, "skill-scanner")) {
      return;
    }
    throw error;
  }
};

const runSkillScanner = async (input: {
  llmConsensusRuns: number;
  llmModel?: string;
  llmProvider?: string;
  outputPath: string;
  policy: string;
  repoDir: string;
  scanDir: string;
  useBehavioral: boolean;
  useLlm: boolean;
  useMeta: boolean;
  useTrigger: boolean;
  useVirusTotal: boolean;
  verbose: boolean;
  vtUploadFiles: boolean;
}): Promise<{
  parsedSarif: SarifLog;
  stderr: string;
  stdout: string;
}> => {
  const args = [
    "scan",
    input.scanDir,
    "--format",
    "sarif",
    "--output",
    input.outputPath,
    "--policy",
    input.policy,
    "--lenient",
  ];

  if (input.useBehavioral) {
    args.push("--use-behavioral");
  }
  if (input.useTrigger) {
    args.push("--use-trigger");
  }
  if (input.useLlm) {
    args.push("--use-llm", "--llm-consensus-runs", String(input.llmConsensusRuns));
    if (input.llmProvider) {
      args.push("--llm-provider", input.llmProvider);
    }
  }
  if (input.useMeta) {
    args.push("--enable-meta");
  }
  if (input.useVirusTotal) {
    args.push("--use-virustotal");
    if (input.vtUploadFiles) {
      args.push("--vt-upload-files");
    }
  }

  let result: ExecResult;
  try {
    result = await runCommand("skill-scanner", args, {
      cwd: input.repoDir,
      env: {
        ...process.env,
        ...(input.llmModel ? { SKILL_SCANNER_LLM_MODEL: input.llmModel } : {}),
      },
      verbose: input.verbose,
    });
  } catch (error) {
    if (isCommandNotFoundError(error, "skill-scanner")) {
      throw new Error(
        "skill-scanner command not found. Install cisco-ai-skill-scanner before running audit:run.",
        { cause: error },
      );
    }
    throw error;
  }

  if (result.code !== 0) {
    throw new Error(`skill-scanner failed: ${result.stderr || result.stdout}`);
  }

  const parsedSarif = await readJsonFile<SarifLog>(input.outputPath);
  return {
    parsedSarif,
    stderr: result.stderr,
    stdout: result.stdout,
  };
};

const sleep = (delayMs: number) => (delayMs > 0 ? setTimeoutP(delayMs) : Promise.resolve());

const runSkillScannerWithModelFallback = async (input: {
  llmConsensusRuns: number;
  llmModelRotation: string[];
  llmProvider?: string;
  outputPath: string;
  policy: string;
  repoDir: string;
  scanDir: string;
  useBehavioral: boolean;
  useLlm: boolean;
  useMeta: boolean;
  useTrigger: boolean;
  useVirusTotal: boolean;
  verbose: boolean;
  vtUploadFiles: boolean;
}) => {
  const attemptedModels: string[] = [];
  let lastError: unknown;

  const effectiveModels =
    input.useLlm && input.llmModelRotation.length > 0 ? input.llmModelRotation : [undefined];

  for (const model of effectiveModels) {
    try {
      if (model) {
        attemptedModels.push(model);
        logVerbose(input.verbose, `skill-scanner llm model=${model}`);
      }

      const result = await runSkillScanner({
        llmConsensusRuns: input.llmConsensusRuns,
        llmModel: model,
        llmProvider: input.llmProvider,
        outputPath: input.outputPath,
        policy: input.policy,
        repoDir: input.repoDir,
        scanDir: input.scanDir,
        useBehavioral: input.useBehavioral,
        useLlm: input.useLlm,
        useMeta: input.useMeta,
        useTrigger: input.useTrigger,
        useVirusTotal: input.useVirusTotal,
        verbose: input.verbose,
        vtUploadFiles: input.vtUploadFiles,
      });

      return {
        ...result,
        attemptedModels,
        selectedModel: model,
      };
    } catch (error) {
      lastError = error;
      if (!(model && isRetryableModelError(error))) {
        throw error;
      }

      logVerbose(
        input.verbose,
        `skill-scanner retryable llm failure for model=${model}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("skill-scanner failed for all configured LLM models.");
};

const withUniqueSarifRunCategories = (input: {
  categoryBase: string;
  sarif: SarifLog;
}): SarifLog => ({
  ...input.sarif,
  runs: (input.sarif.runs ?? []).map((run, index) => ({
    ...run,
    automationDetails: {
      ...run.automationDetails,
      id: `${input.categoryBase}/${String(index + 1)}`,
    },
  })),
});

const buildAndWriteAuditResult = async (input: {
  args: ParseState;
  effectiveSkillRootPath: string | undefined;
  outputDir: string;
  repoDir: string;
  scannerVersion: string | undefined;
  startedAt: number;
  target: AuditTargetRecord;
  workspaceDir: string;
}): Promise<{
  indexItem: AuditIndexItem;
  isBlocked: boolean;
  sarifRuns: SarifLog["runs"];
}> => {
  const {
    args,
    effectiveSkillRootPath,
    outputDir,
    repoDir,
    scannerVersion,
    startedAt,
    target,
    workspaceDir,
  } = input;
  const scanDir = effectiveSkillRootPath ? path.join(repoDir, effectiveSkillRootPath) : repoDir;
  const stats = await fs.stat(scanDir);
  if (!stats.isDirectory()) {
    throw new Error(`scan path is not a directory: ${scanDir}`);
  }

  const fileStats = await scanFileStats(scanDir);
  const llmModelRotation = buildLlmModelRotation({ configuredModel: args.llmModel });
  const sourceHash = await computeSourceHash(repoDir, scanDir, args.verbose);
  const sarifPath = path.join(workspaceDir, `skill-scanner-${target.id}.sarif`);
  const scannerResult = await runSkillScannerWithModelFallback({
    llmConsensusRuns: args.llmConsensusRuns,
    llmModelRotation,
    llmProvider: args.llmProvider,
    outputPath: sarifPath,
    policy: args.policy,
    repoDir,
    scanDir,
    useBehavioral: args.useBehavioral,
    useLlm: args.useLlm,
    useMeta: args.useMeta,
    useTrigger: args.useTrigger,
    useVirusTotal: args.useVirusTotal,
    verbose: args.verbose,
    vtUploadFiles: args.vtUploadFiles,
  });
  const categorizedSarif = withUniqueSarifRunCategories({
    categoryBase: `skill-scanner/${target.id}`,
    sarif: scannerResult.parsedSarif,
  });
  const normalized = parseSkillScannerSarif({ payload: categorizedSarif, repoDir });
  const scoring = scoreAuditFindings(normalized.findings);

  const report: StaticAuditReport = {
    evaluation: {
      is_blocked: scoring.isBlocked,
      overall_score: scoring.overallScore,
      risk_level: scoring.riskLevel,
      safe_to_publish: scoring.safeToPublish,
      status: scoring.status,
    },
    meta: {
      generated_at: new Date().toISOString(),
      model_version: scannerResult.selectedModel ?? undefined,
      pipeline: args.pipeline,
      pipeline_run_id: args.pipelineRunId,
      rules_version: args.rulesVersion,
      source_hash: sourceHash,
      source_ref: target.sourceRef ?? "refs/heads/main",
      source_type: "github",
      tree_hash: sourceHash,
    },
    provider: {
      llm: {
        consensus_runs: args.llmConsensusRuns,
        enabled: args.useLlm,
        model: scannerResult.selectedModel ?? undefined,
        provider: args.llmProvider,
      },
      name: normalized.scannerName ?? "cisco-ai-skill-scanner",
      outputs: { audit_sarif_path: undefined },
      policy: args.policy,
      scanner_version: scannerVersion ?? normalized.scannerVersion,
      summary: {
        findings_count: scoring.findings.length,
        highest_severity: normalized.highestSeverity,
      },
      virustotal: { enabled: args.useVirusTotal, upload_files: args.vtUploadFiles },
    },
    security_audit: {
      files_scanned: fileStats.filesScanned,
      findings: scoring.findings,
      risk_factors: [...new Set(scoring.findings.map((finding) => finding.category))],
      summary: summarizeFindings(scoring.findings),
      total_lines: fileStats.totalLines,
    },
    target: {
      entry_path: effectiveSkillRootPath ? `${effectiveSkillRootPath}/SKILL.md` : "SKILL.md",
      owner: target.owner,
      repo: target.repo,
      snapshot_id: target.snapshotId,
      skill_root_path: effectiveSkillRootPath,
    },
    timings: { total_ms: Date.now() - startedAt },
  };

  const parsedReport = staticAuditReportSchema.parse(report);
  const written = await writeAuditOutput({ outputDir, report: parsedReport, target });
  const artifactSarifPath = path.join(written.artifactDir, "audit.sarif");
  await fs.writeFile(artifactSarifPath, `${JSON.stringify(categorizedSarif, null, 2)}\n`, "utf-8");

  const reportWithProviderOutput = staticAuditReportSchema.parse({
    ...written.report,
    provider: written.report.provider
      ? {
          ...written.report.provider,
          outputs: {
            ...written.report.provider.outputs,
            audit_sarif_path: toRelative(process.cwd(), artifactSarifPath),
          },
        }
      : undefined,
  });
  await fs.writeFile(
    written.auditJsonPath,
    `${JSON.stringify(reportWithProviderOutput, null, 2)}\n`,
    "utf-8",
  );

  return {
    indexItem: {
      auditJsonPath: toRelative(process.cwd(), written.auditJsonPath),
      auditMdPath: toRelative(process.cwd(), written.auditMdPath),
      auditSarifPath: toRelative(process.cwd(), artifactSarifPath),
      findingsCount: reportWithProviderOutput.security_audit.findings.length,
      id: target.id,
      isBlocked: reportWithProviderOutput.evaluation.is_blocked,
      overallScore: reportWithProviderOutput.evaluation.overall_score,
      owner: target.owner,
      repo: target.repo,
      riskLevel: reportWithProviderOutput.evaluation.risk_level,
      safeToPublish: reportWithProviderOutput.evaluation.safe_to_publish,
      skillRootPath: effectiveSkillRootPath,
    },
    isBlocked: reportWithProviderOutput.evaluation.is_blocked,
    sarifRuns: normalized.runs,
  };
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  const targetsPath = path.isAbsolute(args.targetsPath)
    ? args.targetsPath
    : path.join(process.cwd(), args.targetsPath);
  const outputDir = path.isAbsolute(args.outputDir)
    ? args.outputDir
    : path.join(process.cwd(), args.outputDir);
  const targets = await readJsonFile<AuditTargetRecord[]>(targetsPath);
  const scannerVersion = await resolveSkillScannerVersion(args.verbose);

  await fs.mkdir(outputDir, { recursive: true });

  const indexItems: AuditIndexItem[] = [];
  const failedItems: AuditFailedIndexItem[] = [];
  const combinedSarifRuns: SarifLog["runs"] = [];
  let hasBlockedTarget = false;

  for (const [index, target] of targets.entries()) {
    console.log(`[audit] scanning ${target.owner}/${target.repo}`);
    const startedAt = Date.now();
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "skills-audit-"));
    const repoDir = path.join(workspaceDir, `${target.owner}-${target.repo}`);
    let effectiveSkillRootPath = target.skillRootPath;

    try {
      const cloneResult = await cloneAuditTargetRepo({
        repoDir,
        target,
        verbose: args.verbose,
        workspaceDir,
      });
      effectiveSkillRootPath = cloneResult.resolvedSkillRootPath;
      const result = await buildAndWriteAuditResult({
        args,
        effectiveSkillRootPath,
        outputDir,
        repoDir,
        scannerVersion,
        startedAt,
        target,
        workspaceDir,
      });
      indexItems.push(result.indexItem);
      combinedSarifRuns.push(...(result.sarifRuns ?? []));
      if (result.isBlocked) {
        hasBlockedTarget = true;
      }
    } catch (error) {
      const description = describeError(error);
      const location = effectiveSkillRootPath
        ? `${target.owner}/${target.repo}#${effectiveSkillRootPath}`
        : `${target.owner}/${target.repo}`;
      console.error(`[audit] failed ${location}: ${description}`);
      if (args.verbose && error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      failedItems.push({
        error: description,
        id: target.id,
        owner: target.owner,
        repo: target.repo,
        skillRootPath: effectiveSkillRootPath,
      });
    } finally {
      await fs.rm(workspaceDir, { force: true, recursive: true });
    }

    if (index < targets.length - 1) {
      await sleep(args.delayMsBetweenTargets);
    }
  }

  const indexPayload: AuditIndexPayload = {
    failedItems,
    generatedAt: new Date().toISOString(),
    hasBlockedTarget,
    items: indexItems,
  };
  const indexPath = path.join(outputDir, "index.json");
  await fs.writeFile(indexPath, `${JSON.stringify(indexPayload, null, 2)}\n`, "utf-8");
  await fs.writeFile(
    path.join(outputDir, "skill-scanner.sarif"),
    `${JSON.stringify({ runs: combinedSarifRuns, version: "2.1.0" }, null, 2)}\n`,
    "utf-8",
  );

  console.log(
    `[audit] wrote ${indexItems.length} reports to ${outputDir}${failedItems.length > 0 ? ` (${failedItems.length} failed target(s))` : ""}`,
  );

  if (args.failOnBlock && hasBlockedTarget) {
    process.exitCode = 2;
  }
};

await run();
