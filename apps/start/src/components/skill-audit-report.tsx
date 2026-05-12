import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getSkillAuditReport } from "@/functions/skills/get-skill-audit-report";
import { m } from "@/paraglide/messages";

type AuditReport = NonNullable<Awaited<ReturnType<typeof getSkillAuditReport>>>;
type AuditFinding = AuditReport["findings"][number];
type AuditSeverity = AuditFinding["severity"];
type AuditCategory = AuditFinding["category"];

const CATEGORIES: AuditCategory[] = [
  "execution",
  "data_exfiltration",
  "credentials",
  "supply_chain",
  "persistence",
  "network",
  "filesystem",
  "obfuscation",
  "hidden_helpers",
  "prompt_injection",
];

const SEVERITY_COLORS: Record<AuditSeverity, { badge: string; card: string }> = {
  critical: {
    badge: "border-[#b23314] text-[#b23314]",
    card: "border-[#b23314]/25 bg-[#b23314]/5",
  },
  high: {
    badge: "border-[#b06d15] text-[#b06d15]",
    card: "border-[#b06d15]/25 bg-[#b06d15]/5",
  },
  low: {
    badge: "border-[var(--editorial-blue)] text-[var(--editorial-blue)]",
    card: "border-[var(--editorial-blue)]/20 bg-[var(--editorial-blue)]/5",
  },
  medium: {
    badge: "border-[#a08020] text-[#a08020]",
    card: "border-[#a08020]/25 bg-[#a08020]/5",
  },
};

const getAuditCategoryLabel = (category: AuditCategory): string => {
  const labels: Record<AuditCategory, string> = {
    credentials: m.skill_audit_category_credentials(),
    data_exfiltration: m.skill_audit_category_data_exfiltration(),
    execution: m.skill_audit_category_execution(),
    filesystem: m.skill_audit_category_filesystem(),
    hidden_helpers: m.skill_audit_category_hidden_helpers(),
    network: m.skill_audit_category_network(),
    obfuscation: m.skill_audit_category_obfuscation(),
    persistence: m.skill_audit_category_persistence(),
    prompt_injection: m.skill_audit_category_prompt_injection(),
    supply_chain: m.skill_audit_category_supply_chain(),
  };
  return labels[category];
};

const getCategoryCounts = (findings: AuditFinding[]) => {
  const counts = Object.fromEntries(CATEGORIES.map((cat) => [cat, 0])) as Record<
    AuditCategory,
    number
  >;
  for (const finding of findings) {
    counts[finding.category] += 1;
  }
  return counts;
};

const getSeverityCounts = (findings: AuditFinding[]) => {
  const counts: Record<AuditSeverity, number> = { critical: 0, high: 0, low: 0, medium: 0 };
  for (const finding of findings) {
    counts[finding.severity] += 1;
  }
  return counts;
};

const formatLocation = (loc: { endLine?: number; path: string; startLine: number }) =>
  `${loc.path}:${loc.endLine ? `${loc.startLine}–${loc.endLine}` : loc.startLine}`;

interface Props {
  snapshotId: string;
  version?: string;
}

export function SkillAuditReport({ snapshotId, version }: Props) {
  const fetchReport = useServerFn(getSkillAuditReport);

  const {
    data: report,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["skillAuditReport", snapshotId],
    queryFn: () => fetchReport({ data: { snapshotId } }),
    refetchInterval: 5 * 60 * 1000,
  });

  return (
    <div className="border border-border font-mono text-[11px]">
      <div className="border-b border-border px-5 py-3.5 bg-[var(--paper-2)] text-muted-text tracking-[0.18em] uppercase">
        {m.skill_audit_report_title()}
        {version ? ` · v${version}` : ""}
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-8">
        {isLoading ? <AuditReportSkeleton /> : null}

        {isError ? (
          <p className="text-[var(--editorial-red)] font-serif text-[15px]">
            {m.skill_audit_error()}
          </p>
        ) : null}

        {!isLoading && !isError && !report ? (
          <p className="text-muted-text font-serif text-[15px]">{m.skill_audit_pending()}</p>
        ) : null}

        {!isLoading && !isError && report ? <AuditPanel report={report} /> : null}
      </div>
    </div>
  );
}

function AuditPanel({ report }: { report: AuditReport }) {
  const categoryCounts = getCategoryCounts(report.findings);
  const severityCounts = getSeverityCounts(report.findings);
  const severityOrder: AuditSeverity[] = ["critical", "high", "medium", "low"];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 border border-border sm:grid-cols-4">
        <SummaryCell label={m.skill_audit_overall_score()} value={`${report.overallScore}/100`} />
        <SummaryCell label={m.skill_audit_risk_level()} value={report.riskLevel} />
        <SummaryCell
          label={m.skill_audit_files_scanned()}
          value={String(report.scanner.filesScanned)}
        />
        <SummaryCell
          label={m.skill_audit_total_lines()}
          value={String(report.scanner.totalLines)}
        />
      </div>

      {report.scanner.providerName && (
        <p className="text-muted-text text-[10.5px] tracking-[0.06em]">
          {m.skill_audit_scanner_label()}:{" "}
          <span className="text-[var(--ink)] font-medium">{report.scanner.providerName}</span>
          {report.scanner.scannerVersion && ` · v${report.scanner.scannerVersion}`}
          {report.scanner.model && ` · ${report.scanner.model}`}
        </p>
      )}

      {report.summary && (
        <p className="text-[var(--ink-2)] font-serif text-[15px] leading-[1.6] max-w-170">
          {report.summary}
        </p>
      )}

      <section>
        <div className="text-muted-text text-[10px] tracking-[0.2em] mb-1.5 uppercase">
          {m.skill_audit_categories_tested()}
        </div>
        <h3 className="mb-4 font-display text-[clamp(22px,3vw,28px)] font-normal leading-none tracking-[-0.01em]">
          {m.skill_audit_coverage_map()}
        </h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {CATEGORIES.map((category) => {
            const count = categoryCounts[category];
            const isActive = count > 0;
            return (
              <div
                key={category}
                className={`border p-3 ${
                  isActive
                    ? "bg-[rgba(160,128,32,0.06)] border-[rgba(160,128,32,0.4)]"
                    : "bg-[var(--paper-2)] border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center border ${
                      isActive
                        ? "border-[rgba(160,128,32,0.4)] text-[#a08020]"
                        : "border-[rgba(45,90,61,0.4)] text-[var(--editorial-green)]"
                    }`}
                  >
                    {isActive ? <WarningIcon /> : <CheckIcon />}
                  </div>
                  {isActive && (
                    <span className="border px-1.5 py-0.5 font-mono text-[9px] leading-none bg-[rgba(160,128,32,0.1)] border-[rgba(160,128,32,0.35)] text-[#a08020]">
                      {count}
                    </span>
                  )}
                </div>
                <div className="mt-3 text-[12px] leading-[1.3] text-[var(--ink)] font-serif">
                  {getAuditCategoryLabel(category)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border border-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-muted-text text-[10px] tracking-[0.2em] mb-2 uppercase">
              {m.skill_audit_security_issues()}
            </div>
            <h3 className="text-[var(--ink)] font-display text-[clamp(28px,4vw,40px)] font-normal leading-none tracking-[-0.01em]">
              {report.findings.length === 0
                ? m.skill_audit_no_findings()
                : m.skill_audit_findings_count({ count: report.findings.length })}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {severityOrder.map((severity) =>
              severityCounts[severity] > 0 ? (
                <span
                  key={severity}
                  className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${SEVERITY_COLORS[severity].badge}`}
                >
                  {severityCounts[severity]} {severity}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </section>

      {report.findings.length > 0 ? (
        <section className="space-y-4">
          {report.findings.map((finding, index) => (
            <FindingCard
              key={`${finding.rule_id}-${finding.location.path}-${index}`}
              finding={finding}
            />
          ))}
        </section>
      ) : (
        <section className="border px-5 py-4 bg-[rgba(45,90,61,0.05)] border-[rgba(45,90,61,0.3)]">
          <p className="text-[var(--editorial-green)] font-serif text-[15px] m-0">
            {m.skill_audit_pass_message()}
          </p>
        </section>
      )}
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border border-r px-4 py-3 last:border-r-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-[22px] leading-none text-ink">{value}</div>
    </div>
  );
}

function FindingCard({ finding }: { finding: AuditFinding }) {
  const colors = SEVERITY_COLORS[finding.severity];
  return (
    <article className={`overflow-hidden border ${colors.card}`}>
      <div className="border-b border-border/50 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${colors.badge}`}
            >
              {finding.severity}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-text">
              {getAuditCategoryLabel(finding.category)}
            </span>
          </div>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-text">
            {m.skill_audit_finding_line()} {finding.location.startLine}
          </span>
        </div>
        <p className="mt-3 text-balance text-[var(--ink)] font-display text-[clamp(18px,2.5vw,22px)] font-normal leading-[1.1] tracking-[-0.01em]">
          {finding.message}
        </p>
      </div>

      <div className="grid gap-3 border-b border-border/50 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5 bg-[var(--paper)/0.35]">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-text">
            {m.skill_audit_finding_source()}
          </div>
          <div className="mt-1.5 font-mono text-[12px] text-[var(--ink)]">
            {formatLocation(finding.location)}
          </div>
        </div>
        <div className="sm:text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-text">
            {m.skill_audit_finding_rule()}
          </div>
          <div className="mt-1.5 font-mono text-[12px] text-[var(--ink)]">{finding.rule_id}</div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-text">
          {m.skill_audit_finding_evidence()}
        </div>
        <p className="mt-2 text-[var(--ink)] font-serif text-[15px] leading-[1.65]">
          {finding.evidence}
        </p>
        {finding.fix && (
          <>
            <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-text">
              {m.skill_audit_finding_suggested_fix()}
            </div>
            <p className="mt-2 text-[var(--ink-2)] font-serif text-[15px] leading-[1.65]">
              {finding.fix}
            </p>
          </>
        )}
      </div>
    </article>
  );
}

function AuditReportSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 border border-border sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-border border-r px-4 py-3 last:border-r-0">
            <div className="mb-2 h-2 w-20 animate-pulse rounded bg-[var(--rule)]" />
            <div className="h-6 w-14 animate-pulse rounded bg-[var(--rule)]" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-full max-w-lg animate-pulse rounded bg-[var(--rule)]" />
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-[var(--rule)]" />
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-[var(--rule)]" />
      </div>
      <div>
        <div className="mb-1.5 h-2 w-28 animate-pulse rounded bg-[var(--rule)]" />
        <div className="mb-4 h-7 w-40 animate-pulse rounded bg-[var(--rule)]" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse border p-3 bg-[var(--paper-2)] border-[var(--rule)]"
            />
          ))}
        </div>
      </div>
      <div className="h-24 animate-pulse border border-border p-4 bg-[var(--paper-2)]" />
    </div>
  );
}

function WarningIcon() {
  return <span aria-hidden>!</span>;
}

function CheckIcon() {
  return <span aria-hidden>✓</span>;
}
