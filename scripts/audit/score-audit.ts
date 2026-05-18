import type { StaticAuditFinding } from "./types";

const severityWeights: Record<StaticAuditFinding["severity"], number> = {
  critical: 20,
  high: 12,
  low: 2,
  medium: 6,
};

const categoryWeights: Record<StaticAuditFinding["category"], number> = {
  credentials: 1.3,
  data_exfiltration: 1.4,
  execution: 1.4,
  filesystem: 1,
  hidden_helpers: 0.9,
  network: 1.1,
  obfuscation: 1,
  persistence: 1.2,
  prompt_injection: 0.8,
  social_engineering: 1.15,
  specification: 0.6,
  supply_chain: 1.25,
};

export const getContextFactor = (filePath: string): number => {
  const normalizedPath = filePath.replaceAll("\\", "/").toLowerCase();
  if (
    normalizedPath.endsWith(".md") ||
    normalizedPath.includes("/docs/") ||
    normalizedPath.includes("/doc/")
  ) {
    return 0.35;
  }

  if (
    normalizedPath.includes("/test/") ||
    normalizedPath.includes("/tests/") ||
    normalizedPath.includes("/__tests__/") ||
    normalizedPath.endsWith(".test.ts") ||
    normalizedPath.endsWith(".test.tsx") ||
    normalizedPath.endsWith(".spec.ts") ||
    normalizedPath.endsWith(".spec.tsx")
  ) {
    return 0.6;
  }

  return 1;
};

const getConfidenceFactor = (confidence: number): number => Math.max(0.5, Math.min(1, confidence));

const categoryBlockPredicates = new Set<StaticAuditFinding["category"]>([
  "credentials",
  "data_exfiltration",
]);

const dedupeFindings = (findings: StaticAuditFinding[]): StaticAuditFinding[] => {
  const seen = new Set<string>();
  const deduped: StaticAuditFinding[] = [];

  for (const finding of findings) {
    const key = `${finding.rule_id}::${finding.location.path}::${finding.location.startLine}::${finding.location.endLine ?? finding.location.startLine}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(finding);
  }

  return deduped;
};

export interface StaticAuditScoreResult {
  findings: StaticAuditFinding[];
  isBlocked: boolean;
  overallScore: number;
  riskLevel: "safe" | "low" | "medium" | "high" | "critical";
  safeToPublish: boolean;
  status: "pass" | "fail";
}

const evaluateBlockState = (
  finding: StaticAuditFinding,
  contextFactor: number,
): { hasHardCriticalBlock: boolean; hasHighRiskTrigger: boolean } => ({
  hasHardCriticalBlock:
    finding.severity === "critical" && finding.confidence >= 0.75 && contextFactor >= 1,
  hasHighRiskTrigger:
    finding.severity === "high" &&
    finding.confidence >= 0.8 &&
    categoryBlockPredicates.has(finding.category),
});

const deriveRiskLevel = (input: {
  hasHardCriticalBlock: boolean;
  hasHighOrCritical: boolean;
  hasHighRiskTrigger: boolean;
  overallScore: number;
}): StaticAuditScoreResult["riskLevel"] => {
  if (input.hasHardCriticalBlock) {
    return "critical";
  }

  let riskLevel: StaticAuditScoreResult["riskLevel"] = "critical";
  if (input.overallScore >= 90 && !input.hasHighOrCritical) {
    riskLevel = "safe";
  } else if (input.overallScore >= 75) {
    riskLevel = "low";
  } else if (input.overallScore >= 60) {
    riskLevel = "medium";
  } else if (input.overallScore >= 40) {
    riskLevel = "high";
  }

  if (input.hasHighRiskTrigger && (riskLevel === "safe" || riskLevel === "low")) {
    return "high";
  }

  return riskLevel;
};

export const scoreAuditFindings = (findings: StaticAuditFinding[]): StaticAuditScoreResult => {
  const normalizedFindings = dedupeFindings(findings);
  const categoryPenalty = new Map<StaticAuditFinding["category"], number>();

  let totalPenalty = 0;
  let hasHighRiskTrigger = false;
  let hasHighOrCritical = false;
  let hasHardCriticalBlock = false;

  for (const finding of normalizedFindings) {
    if (finding.severity === "high" || finding.severity === "critical") {
      hasHighOrCritical = true;
    }

    const contextFactor = getContextFactor(finding.location.path);
    const confidenceFactor = getConfidenceFactor(finding.confidence);
    const severityWeight = severityWeights[finding.severity];
    const categoryWeight = categoryWeights[finding.category];
    const penalty = severityWeight * categoryWeight * confidenceFactor * contextFactor;

    const currentCategoryPenalty = categoryPenalty.get(finding.category) ?? 0;
    const nextCategoryPenalty = Math.min(35, currentCategoryPenalty + penalty);
    categoryPenalty.set(finding.category, nextCategoryPenalty);

    const appliedDelta = nextCategoryPenalty - currentCategoryPenalty;
    totalPenalty += appliedDelta;

    const blockState = evaluateBlockState(finding, contextFactor);
    hasHardCriticalBlock ||= blockState.hasHardCriticalBlock;
    hasHighRiskTrigger ||= blockState.hasHighRiskTrigger;
  }

  totalPenalty = Math.min(100, totalPenalty);
  const overallScore = Math.max(0, Math.round(100 - totalPenalty));
  const isBlocked = hasHardCriticalBlock || hasHighRiskTrigger;
  const safeToPublish = !isBlocked;

  const riskLevel = deriveRiskLevel({
    hasHardCriticalBlock,
    hasHighOrCritical,
    hasHighRiskTrigger,
    overallScore,
  });

  return {
    findings: normalizedFindings,
    isBlocked,
    overallScore,
    riskLevel,
    safeToPublish,
    status: safeToPublish ? "pass" : "fail",
  };
};
