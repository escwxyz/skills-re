import path from "node:path";
import { fileURLToPath } from "node:url";

import type { StaticAuditReport } from "@skills-re/contract/static-audits";

type StaticAuditFinding = StaticAuditReport["security_audit"]["findings"][number];

const CATEGORY_BY_KEYWORD: Record<string, StaticAuditFinding["category"]> = {
  credential: "credentials",
  eval: "execution",
  exfil: "data_exfiltration",
  file: "filesystem",
  filesystem: "filesystem",
  helper: "hidden_helpers",
  hidden: "hidden_helpers",
  network: "network",
  obfus: "obfuscation",
  package: "supply_chain",
  persist: "persistence",
  prompt: "prompt_injection",
  secret: "credentials",
  shell: "execution",
  socket: "network",
  supply: "supply_chain",
  token: "credentials",
  vuln: "supply_chain",
};

const SEVERITY_RANK: Record<StaticAuditFinding["severity"], number> = {
  critical: 4,
  high: 3,
  low: 1,
  medium: 2,
};
const LEADING_DOT_SLASHES_PATTERN = /^\.\/+/;
const LEADING_SLASHES_PATTERN = /^\/+/;

interface SarifMessage {
  markdown?: string;
  text?: string;
}

interface SarifArtifactLocation {
  uri?: string;
}

interface SarifRegion {
  endLine?: number;
  startLine?: number;
}

interface SarifPhysicalLocation {
  artifactLocation?: SarifArtifactLocation;
  region?: SarifRegion;
}

interface SarifLocation {
  physicalLocation?: SarifPhysicalLocation;
}

interface SarifFix {
  description?: SarifMessage;
}

interface SarifResult {
  fixes?: SarifFix[];
  level?: string;
  locations?: SarifLocation[];
  message?: SarifMessage;
  properties?: Record<string, unknown>;
  ruleId?: string;
}

interface SarifRule {
  fullDescription?: SarifMessage;
  help?: SarifMessage;
  id?: string;
  name?: string;
  properties?: Record<string, unknown>;
  shortDescription?: SarifMessage;
}

interface SarifToolDriver {
  name?: string;
  rules?: SarifRule[];
  version?: string;
}

interface SarifRun {
  automationDetails?: {
    id?: string;
  };
  results?: SarifResult[];
  tool?: {
    driver?: SarifToolDriver;
  };
}

export interface SarifLog {
  runs?: SarifRun[];
  version?: string;
}

export interface SkillScannerParseResult {
  findings: StaticAuditFinding[];
  highestSeverity?: StaticAuditFinding["severity"];
  runs: SarifRun[];
  scannerName?: string;
  scannerVersion?: string;
}

const normalizePath = (value: string) => value.replaceAll("\\", "/");

const toRelativePath = (baseDir: string, filePath: string) => {
  if (path.isAbsolute(filePath)) {
    return normalizePath(path.relative(baseDir, filePath)).replace(LEADING_SLASHES_PATTERN, "");
  }

  return normalizePath(filePath).replace(LEADING_DOT_SLASHES_PATTERN, "");
};

const readString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const readNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
};

const normalizeSeverity = (input: {
  level?: string;
  securitySeverity?: number;
  severityText?: string;
}): StaticAuditFinding["severity"] => {
  if (typeof input.securitySeverity === "number") {
    if (input.securitySeverity >= 9) {
      return "critical";
    }
    if (input.securitySeverity >= 7) {
      return "high";
    }
    if (input.securitySeverity >= 4) {
      return "medium";
    }
    return "low";
  }

  const severityText = `${input.severityText ?? ""} ${input.level ?? ""}`.trim().toLowerCase();
  if (severityText.includes("critical")) {
    return "critical";
  }
  if (severityText.includes("high") || severityText.includes("error")) {
    return "high";
  }
  if (severityText.includes("medium") || severityText.includes("warning")) {
    return "medium";
  }
  return "low";
};

const defaultConfidence = (severity: StaticAuditFinding["severity"]) => {
  if (severity === "critical") {
    return 0.95;
  }
  if (severity === "high") {
    return 0.88;
  }
  if (severity === "medium") {
    return 0.72;
  }
  return 0.62;
};

const normalizeConfidence = (value: unknown, severity: StaticAuditFinding["severity"]) => {
  const numeric = readNumber(value);
  if (numeric === undefined) {
    return defaultConfidence(severity);
  }
  if (numeric > 1) {
    return Math.max(0, Math.min(1, numeric / 100));
  }
  return Math.max(0, Math.min(1, numeric));
};

const collectTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => readString(item)).filter(Boolean) as string[];
};

const resolveCategory = (parts: string[]) => {
  const normalized = parts.join(" ").toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_BY_KEYWORD)) {
    if (normalized.includes(keyword)) {
      return category;
    }
  }
  return "filesystem";
};

const resolveSource = (parts: string[]): StaticAuditFinding["source"] => {
  const normalized = parts.join(" ").toLowerCase();
  const mentionsLlm =
    normalized.includes("llm") ||
    normalized.includes("language model") ||
    normalized.includes("gemini");
  const mentionsHybrid = normalized.includes("hybrid") || normalized.includes("meta analyzer");

  if (mentionsHybrid) {
    return "hybrid";
  }
  if (mentionsLlm) {
    return "llm";
  }
  return "rule";
};

const resolveArtifactPath = (repoDir: string, uri?: string) => {
  const raw = readString(uri);
  if (!raw) {
    return "unknown";
  }

  let filePath = raw;
  if (raw.startsWith("file://")) {
    try {
      filePath = fileURLToPath(raw);
    } catch {
      filePath = raw;
    }
  }

  if (filePath.startsWith("/")) {
    return toRelativePath(repoDir, filePath);
  }

  return normalizePath(decodeURIComponent(filePath)).replace(LEADING_DOT_SLASHES_PATTERN, "");
};

const dedupeFindings = (findings: StaticAuditFinding[]) => {
  const seen = new Set<string>();
  const deduped: StaticAuditFinding[] = [];

  for (const finding of findings) {
    const key = `${finding.rule_id}:${finding.location.path}:${finding.location.startLine}:${finding.location.endLine ?? finding.location.startLine}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(finding);
  }

  return deduped;
};

const resolveSarifSeverity = (
  properties: Record<string, unknown>,
  rule: SarifRule | undefined,
  level: string | undefined,
) =>
  normalizeSeverity({
    level,
    securitySeverity:
      readNumber(properties["security-severity"]) ?? readNumber(properties.securitySeverity),
    severityText:
      readString(properties.severity) ?? readString(properties.priority) ?? readString(rule?.name),
  });

const resolveResultMessage = (result: SarifResult, rule: SarifRule | undefined): string =>
  readString(result.message?.text) ??
  readString(result.message?.markdown) ??
  readString(rule?.shortDescription?.text) ??
  readString(rule?.name) ??
  "Skill scanner finding";

const resolveResultEvidence = (rule: SarifRule | undefined, message: string): string =>
  readString(rule?.help?.text) ?? readString(rule?.fullDescription?.text) ?? message;

const resolveResultFix = (result: SarifResult): string | undefined =>
  result.fixes?.[0]?.description?.text ?? result.fixes?.[0]?.description?.markdown;

const resolveResultLocation = (repoDir: string, result: SarifResult) => {
  const location = result.locations?.[0]?.physicalLocation;
  return {
    endLine: location?.region?.endLine,
    path: resolveArtifactPath(repoDir, location?.artifactLocation?.uri),
    startLine: location?.region?.startLine ?? 1,
  };
};

const parseSarifResult = (input: { repoDir: string; result: SarifResult; rule?: SarifRule }) => {
  const ruleId = readString(input.result.ruleId) ?? "skill-scanner.unknown";
  const properties: Record<string, unknown> = {
    ...input.rule?.properties,
    ...input.result.properties,
  };
  const tags = [
    ...collectTags(input.rule?.properties?.tags),
    ...collectTags(input.result.properties?.tags),
  ];
  const severity = resolveSarifSeverity(properties, input.rule, input.result.level);
  const message = resolveResultMessage(input.result, input.rule);
  const evidence = resolveResultEvidence(input.rule, message);
  const parts = [ruleId, input.rule?.name ?? "", message, evidence, ...tags];

  return {
    finding: {
      category: resolveCategory(parts),
      confidence: normalizeConfidence(properties.confidence, severity),
      evidence,
      fix: resolveResultFix(input.result),
      location: resolveResultLocation(input.repoDir, input.result),
      message,
      rule_id: ruleId,
      severity,
      source: resolveSource(parts),
    } satisfies StaticAuditFinding,
  };
};

export const parseSkillScannerSarif = (input: {
  payload: SarifLog;
  repoDir: string;
}): SkillScannerParseResult => {
  const findings: StaticAuditFinding[] = [];
  const runs = input.payload.runs ?? [];
  let scannerName: string | undefined;
  let scannerVersion: string | undefined;

  for (const run of runs) {
    scannerName ??= run.tool?.driver?.name;
    scannerVersion ??= run.tool?.driver?.version;

    const rules = new Map(
      (run.tool?.driver?.rules ?? [])
        .map((rule) => [rule.id ?? rule.name ?? "", rule] as const)
        .filter(([id]) => id.length > 0),
    );

    for (const result of run.results ?? []) {
      const rule = readString(result.ruleId)
        ? rules.get(readString(result.ruleId) ?? "")
        : undefined;
      findings.push(
        parseSarifResult({
          repoDir: input.repoDir,
          result,
          rule,
        }).finding,
      );
    }
  }

  const deduped = dedupeFindings(findings);
  const [highestSeverity] = deduped
    .map((finding) => finding.severity)
    .toSorted((left, right) => SEVERITY_RANK[right] - SEVERITY_RANK[left]);

  return {
    findings: deduped,
    highestSeverity,
    runs,
    scannerName,
    scannerVersion,
  };
};
