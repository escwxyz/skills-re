import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type { AuditTarget, AuditTargetRecord } from "./types";

const DEFAULT_OUTPUT = path.join(
  "review-runs",
  "latest",
  "audits",
  "skill-scanner",
  "targets.json",
);
const LEADING_SLASHES_PATTERN = /^\/+/;
const TRAILING_SLASHES_PATTERN = /\/+$/;

const normalizeSegment = (value: string) => value.trim();
const normalizeSkillRootPath = (value: string | undefined) => {
  if (!value) {
    return;
  }

  const normalized = value
    .replaceAll("\\", "/")
    .trim()
    .replace(LEADING_SLASHES_PATTERN, "")
    .replace(TRAILING_SLASHES_PATTERN, "");

  return normalized.length > 0 ? normalized : undefined;
};

const buildTargetId = (target: AuditTarget) => {
  const pathDigest = createHash("sha256")
    .update(target.skillRootPath ?? "root")
    .digest("hex")
    .slice(0, 12);

  return `${target.owner.toLowerCase()}__${target.repo.toLowerCase()}__${pathDigest}`;
};

const parseTarget = (raw: unknown): AuditTargetRecord | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const maybeOwner = Reflect.get(raw, "owner");
  const maybeRepo = Reflect.get(raw, "repo");
  const maybeSourceCommitSha = Reflect.get(raw, "sourceCommitSha");
  const maybeSkillRootPath = Reflect.get(raw, "skillRootPath");
  const maybeSnapshotId = Reflect.get(raw, "snapshotId");
  const maybeSourceRef = Reflect.get(raw, "sourceRef");
  const maybeSourceUrl = Reflect.get(raw, "sourceUrl");

  if (typeof maybeOwner !== "string" || typeof maybeRepo !== "string") {
    return null;
  }

  const owner = normalizeSegment(maybeOwner);
  const repo = normalizeSegment(maybeRepo);
  if (!(owner && repo)) {
    return null;
  }

  const target: AuditTarget = {
    owner,
    repo,
    sourceCommitSha:
      typeof maybeSourceCommitSha === "string" && maybeSourceCommitSha.trim().length > 0
        ? maybeSourceCommitSha.trim()
        : undefined,
    skillRootPath:
      typeof maybeSkillRootPath === "string"
        ? normalizeSkillRootPath(maybeSkillRootPath)
        : undefined,
    snapshotId:
      typeof maybeSnapshotId === "string" && maybeSnapshotId.trim().length > 0
        ? maybeSnapshotId.trim()
        : undefined,
    sourceRef:
      typeof maybeSourceRef === "string" && maybeSourceRef.trim().length > 0
        ? maybeSourceRef.trim()
        : undefined,
    sourceUrl:
      typeof maybeSourceUrl === "string" && maybeSourceUrl.trim().length > 0
        ? maybeSourceUrl.trim()
        : undefined,
  };

  return {
    ...target,
    id: buildTargetId(target),
  };
};

const parseArgs = (argv: string[]) => {
  let output = DEFAULT_OUTPUT;
  let targetsJson = "";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--output") {
      output = argv[index + 1] ?? output;
      index += 1;
      continue;
    }

    if (arg === "--targets-json") {
      targetsJson = argv[index + 1] ?? targetsJson;
      index += 1;
    }
  }

  if (!targetsJson.trim()) {
    throw new Error('Missing required "--targets-json" argument.');
  }

  return { output, targetsJson };
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  const parsed = JSON.parse(args.targetsJson) as unknown;
  if (!Array.isArray(parsed)) {
    throw new TypeError("Expected targets JSON to be an array.");
  }

  const targets = parsed
    .map((entry) => parseTarget(entry))
    .filter((entry): entry is AuditTargetRecord => entry !== null)
    .toSorted((left, right) => left.id.localeCompare(right.id));

  const absoluteOutput = path.isAbsolute(args.output)
    ? args.output
    : path.join(process.cwd(), args.output);

  await fs.mkdir(path.dirname(absoluteOutput), { recursive: true });
  await fs.writeFile(absoluteOutput, `${JSON.stringify(targets, null, 2)}\n`, "utf-8");

  process.stdout.write(
    `[write-dispatch-targets] wrote ${targets.length} targets to ${absoluteOutput}\n`,
  );
};

await run();
