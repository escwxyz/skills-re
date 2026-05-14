import fs from "node:fs/promises";
import path from "node:path";

import type { StaticAuditReport } from "../../packages/contract/src/static-audits";

interface AuditIndex {
  items: {
    auditJsonPath: string;
  }[];
}

interface AllowedTarget {
  owner: string;
  repo: string;
  skillRootPath?: string;
}

const DEFAULT_INDEX_PATH = path.join(
  "review-runs",
  "latest",
  "audits",
  "skill-scanner",
  "index.json",
);

const parseArgs = (argv: string[]) => {
  let indexPath = DEFAULT_INDEX_PATH;
  let baseUrl = process.env.PUBLISH_BASE_URL?.trim() ?? "";
  let onlyPass = true;
  let allowedTargetsPath = process.env.PUBLISHED_AUDIT_TARGETS_PATH?.trim();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--index") {
      indexPath = argv[index + 1] ?? indexPath;
      index += 1;
      continue;
    }
    if (arg === "--base-url") {
      baseUrl = argv[index + 1] ?? baseUrl;
      index += 1;
      continue;
    }
    if (arg === "--only-pass") {
      onlyPass = (argv[index + 1] ?? "true").toLowerCase() !== "false";
      index += 1;
      continue;
    }
    if (arg === "--allowed-targets") {
      allowedTargetsPath = argv[index + 1] ?? allowedTargetsPath;
      index += 1;
    }
  }

  if (!baseUrl) {
    throw new Error("Missing base URL. Set PUBLISH_BASE_URL or pass --base-url.");
  }

  return {
    allowedTargetsPath,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    indexPath,
    onlyPass,
  };
};

const readJson = async <T>(filePath: string) =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as T;

const toAbsolutePath = (filePath: string) =>
  path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

const toTargetKey = (input: { owner: string; repo: string; skillRootPath?: string }) =>
  `${input.owner.toLowerCase()}/${input.repo.toLowerCase()}#${(input.skillRootPath ?? "")
    .replaceAll("\\", "/")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .toLowerCase()}`;

const loadAllowedTargetKeySet = async (allowedTargetsPath: string | undefined) => {
  if (!allowedTargetsPath) {
    return new Set<string>();
  }

  const allowedTargets = await readJson<AllowedTarget[]>(toAbsolutePath(allowedTargetsPath));

  return new Set(
    allowedTargets.map((item) =>
      toTargetKey({
        owner: item.owner,
        repo: item.repo,
        skillRootPath: item.skillRootPath,
      }),
    ),
  );
};

const shouldSkipByAllowedTarget = (input: {
  allowedTargetKeySet: Set<string>;
  itemPath: string;
  report: StaticAuditReport;
}) => {
  if (input.allowedTargetKeySet.size === 0) {
    return null;
  }

  const reportTargetKey = toTargetKey({
    owner: input.report.target.owner,
    repo: input.report.target.repo,
    skillRootPath: input.report.target.skill_root_path,
  });
  if (input.allowedTargetKeySet.has(reportTargetKey)) {
    return null;
  }

  return `[audit-ingest] skipped ${input.itemPath} because target not in allowed set`;
};

const shouldSkipByAuditStatus = (input: {
  itemPath: string;
  onlyPass: boolean;
  report: StaticAuditReport;
}) => {
  if (
    !input.onlyPass ||
    (input.report.evaluation.status === "pass" && !input.report.evaluation.is_blocked)
  ) {
    return null;
  }

  return `[audit-ingest] skipped ${input.itemPath} because status=${input.report.evaluation.status}, blocked=${input.report.evaluation.is_blocked}`;
};

const ingestReport = async (input: {
  endpoint: string;
  itemPath: string;
  report: StaticAuditReport;
  token?: string;
}) => {
  const response = await fetch(input.endpoint, {
    body: JSON.stringify(input.report),
    headers: {
      "content-type": "application/json",
      ...(input.token ? { "x-skills-automation-token": input.token } : {}),
    },
    method: "POST",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[audit-ingest] failed (${response.status}) for ${input.itemPath}: ${text}`);
  }

  const parsed = (await response.json()) as {
    auditId: string;
    status: string;
    upserted: boolean;
  };
  console.log(
    `[audit-ingest] ${input.itemPath} -> id=${parsed.auditId} status=${parsed.status} upserted=${parsed.upserted}`,
  );
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  const indexPath = toAbsolutePath(args.indexPath);
  const indexPayload = await readJson<AuditIndex>(indexPath);
  const token = process.env.AUTOMATION_API_TOKEN?.trim();
  const allowedTargetKeySet = await loadAllowedTargetKeySet(args.allowedTargetsPath);

  if (!Array.isArray(indexPayload.items)) {
    throw new TypeError(`Invalid index format: ${indexPath}`);
  }

  const endpoint = `${args.baseUrl}/skills/audits/ingest`;
  let failed = 0;
  let skipped = 0;

  for (const item of indexPayload.items) {
    const auditPath = toAbsolutePath(item.auditJsonPath);
    const report = await readJson<StaticAuditReport>(auditPath);

    const allowedTargetSkipReason = shouldSkipByAllowedTarget({
      allowedTargetKeySet,
      itemPath: item.auditJsonPath,
      report,
    });
    if (allowedTargetSkipReason) {
      skipped += 1;
      console.log(allowedTargetSkipReason);
      continue;
    }

    const auditStatusSkipReason = shouldSkipByAuditStatus({
      itemPath: item.auditJsonPath,
      onlyPass: args.onlyPass,
      report,
    });
    if (auditStatusSkipReason) {
      skipped += 1;
      console.log(auditStatusSkipReason);
      continue;
    }

    try {
      await ingestReport({
        endpoint,
        itemPath: item.auditJsonPath,
        report,
        token,
      });
    } catch (error) {
      failed += 1;
      console.error(error instanceof Error ? error.message : String(error));
    }
  }

  if (failed > 0) {
    throw new Error(`Failed to ingest ${failed} audit report(s).`);
  }

  console.log(`[audit-ingest] completed. skipped=${skipped}`);
};

await run();
