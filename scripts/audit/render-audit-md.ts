import type { StaticAuditReport } from "../../packages/contract/src/static-audits";

const renderFinding = (finding: StaticAuditReport["security_audit"]["findings"][number]) => {
  const lineSuffix = finding.location.endLine
    ? `${finding.location.startLine}-${finding.location.endLine}`
    : `${finding.location.startLine}`;
  return [
    `- [${finding.severity.toUpperCase()}] \`${finding.rule_id}\` (${finding.category})`,
    `  - File: \`${finding.location.path}:${lineSuffix}\``,
    finding.location.snippet ? `  - Snippet: \`${finding.location.snippet.trim()}\`` : null,
    `  - Message: ${finding.message}`,
    `  - Confidence: ${finding.confidence.toFixed(2)}`,
    `  - Evidence: ${finding.evidence}`,
    finding.fix ? `  - Fix: ${finding.fix}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

const renderProviderMarkdown = (report: StaticAuditReport) => {
  if (!report.provider) {
    return [];
  }

  const llmLine = report.provider.llm
    ? `- LLM: ${report.provider.llm.enabled ? "enabled" : "disabled"}${report.provider.llm.provider ? ` (${report.provider.llm.provider})` : ""}${report.provider.llm.model ? ` model=${report.provider.llm.model}` : ""}${report.provider.llm.consensus_runs ? ` consensus=${report.provider.llm.consensus_runs}` : ""}`
    : null;
  const virusTotalLine = report.provider.virustotal
    ? `- VirusTotal: ${report.provider.virustotal.enabled ? "enabled" : "disabled"}${report.provider.virustotal.upload_files ? " (upload files)" : ""}`
    : null;

  return [
    "",
    "## Scanner",
    `- Provider: ${report.provider.name}`,
    report.provider.scanner_version
      ? `- Scanner version: ${report.provider.scanner_version}`
      : null,
    report.provider.policy ? `- Policy: ${report.provider.policy}` : null,
    llmLine,
    virusTotalLine,
  ].filter(Boolean);
};

export const renderAuditMarkdown = (report: StaticAuditReport) => {
  const findings = report.security_audit.findings.map((finding) => renderFinding(finding));
  const providerLines = renderProviderMarkdown(report);

  return [
    "# Static Audit Report",
    "",
    "## Verdict",
    `- Status: ${report.evaluation.status}`,
    `- Overall score (0-100): ${report.evaluation.overall_score}`,
    `- Risk level: ${report.evaluation.risk_level}`,
    `- Safe to publish: ${report.evaluation.safe_to_publish}`,
    `- Is blocked: ${report.evaluation.is_blocked}`,
    "",
    "## Target",
    `- Repo: ${report.target.owner}/${report.target.repo}`,
    `- Skill root path: ${report.target.skill_root_path ?? "(repo root)"}`,
    `- Entry path: ${report.target.entry_path ?? "(unknown)"}`,
    `- Snapshot id: ${report.target.snapshot_id ?? "(unresolved)"}`,
    "",
    "## Security Summary",
    `- Summary: ${report.security_audit.summary}`,
    `- Files scanned: ${report.security_audit.files_scanned}`,
    `- Total lines: ${report.security_audit.total_lines}`,
    `- Risk factors: ${report.security_audit.risk_factors.join(", ") || "(none)"}`,
    "",
    "## Findings",
    findings.length > 0 ? findings.join("\n\n") : "- No findings detected.",
    ...providerLines,
    "",
    "## Metadata",
    `- Generated at: ${report.meta.generated_at}`,
    `- Pipeline: ${report.meta.pipeline} / ${report.meta.pipeline_run_id}`,
    `- Rules version: ${report.meta.rules_version}`,
    `- Source hash: ${report.meta.source_hash}`,
    `- Source ref: ${report.meta.source_ref ?? "(none)"}`,
  ].join("\n");
};
