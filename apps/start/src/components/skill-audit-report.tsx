// oxlint-disable unicorn/no-nested-ternary
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getSkillAuditReport } from "@/functions/skills/get-skill-audit-report";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { TimeValue } from "./time-value";

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
  "social_engineering",
  "specification",
];

const SEVERITY_COLORS: Record<AuditSeverity, { badge: string; card: string }> = {
  critical: {
    // high contrast red
    badge: "border-red-600 text-red-600",
    card: "border-red-300 bg-red-50",
  },
  high: {
    // strong orange for high
    badge: "border-orange-600 text-orange-600",
    card: "border-orange-300 bg-orange-50",
  },
  medium: {
    // amber for medium severity
    badge: "border-amber-600 text-amber-600",
    card: "border-amber-300 bg-amber-50",
  },
  low: {
    // calm blue for low severity
    badge: "border-blue-600 text-blue-600",
    card: "border-blue-200 bg-blue-50",
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
    social_engineering: m.skill_audit_category_social_engineering(),
    specification: m.skill_audit_category_specification(),
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

const formatScannerVersion = (version: string) => {
  const match = version.match(/(\d+\.\d[\d.]*)/);
  return match ? match[1] : version;
};

const formatModelName = (model: string) => {
  const name = model.includes("/") ? model.slice(model.indexOf("/") + 1) : model;
  return name
    .split("-")
    .map((part) => (/^\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
};

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
      <div className="border-b border-border px-5 py-3.5 bg-muted text-muted-foreground tracking-[0.18em] uppercase">
        {m.skill_audit_report_title()}
        {version ? ` · v${version}` : ""}
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-8">
        {isLoading ? <AuditReportSkeleton /> : null}

        {isError ? (
          <p className="text-destructive font-serif text-[15px]">{m.skill_audit_error()}</p>
        ) : null}

        {!isLoading && !isError && !report ? (
          <p className="text-muted-foreground font-serif text-[15px]">{m.skill_audit_pending()}</p>
        ) : null}

        {!isLoading && !isError && report ? <AuditPanel report={report} /> : null}
      </div>
    </div>
  );
}

function AuditPanel({ report }: { report: AuditReport }) {
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | null>(null);
  const locale = getLocale();
  const categoryCounts = getCategoryCounts(report.findings);
  const severityCounts = getSeverityCounts(report.findings);
  const severityOrder: AuditSeverity[] = ["critical", "high", "medium", "low"];
  const filteredFindings = severityFilter
    ? report.findings.filter((f) => f.severity === severityFilter)
    : report.findings;

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
        <p className="text-muted-foreground text-[10.5px] tracking-[0.06em]">
          {m.skill_audit_scanner_label()}:{" "}
          <a
            href="https://github.com/cisco-ai-defense/skill-scanner"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-medium hover:underline"
          >
            {report.scanner.providerName}
          </a>
          {report.scanner.scannerVersion &&
            ` · v${formatScannerVersion(report.scanner.scannerVersion)}`}
          {report.scanner.model && ` · ${formatModelName(report.scanner.model)}`}
          {report.generatedAt && (
            <>
              {" · "}
              <TimeValue locale={locale} time={report.generatedAt} />
            </>
          )}
        </p>
      )}

      {report.summary && (
        <p className="text-muted-foreground font-serif text-[15px] leading-[1.6] max-w-170">
          {report.summary}
        </p>
      )}

      <section>
        <div className="text-muted-foreground text-[10px] tracking-[0.2em] mb-1.5 uppercase">
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
                  isActive ? "bg-amber-50 border-amber-300" : "bg-muted border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center border ${
                      isActive
                        ? "border-amber-300 text-amber-600"
                        : "border-[rgba(45,90,61,0.4)] text-chart-5"
                    }`}
                  >
                    {isActive ? <WarningIcon /> : <CheckIcon />}
                  </div>
                  {isActive && (
                    <span className="border px-1.5 py-0.5 font-mono text-[9px] leading-none bg-amber-100 border-amber-200 text-amber-600">
                      {count}
                    </span>
                  )}
                </div>
                <div className="mt-3 text-[12px] leading-[1.3] text-foreground font-serif">
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
            <div className="text-muted-foreground text-[10px] tracking-[0.2em] mb-2 uppercase">
              {m.skill_audit_security_issues()}
            </div>
            <h3 className="text-foreground font-display text-[clamp(28px,4vw,40px)] font-normal leading-none tracking-[-0.01em]">
              {report.findings.length === 0
                ? m.skill_audit_no_findings()
                : m.skill_audit_findings_count({ count: report.findings.length })}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {severityOrder.map((severity) => {
              const count = severityCounts[severity];
              const isActive = severityFilter === severity;
              const hasFindings = count > 0;
              return (
                <button
                  key={severity}
                  type="button"
                  onClick={() => hasFindings && setSeverityFilter(isActive ? null : severity)}
                  disabled={!hasFindings}
                  className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                    // oxlint-disable-next-line no-negated-condition
                    !hasFindings
                      ? "border-border text-muted-foreground opacity-35 cursor-default"
                      : isActive
                        ? SEVERITY_COLORS[severity].badge
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground cursor-pointer"
                  }`}
                >
                  {count} {severity}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {report.findings.length > 0 ? (
        <section className="space-y-4">
          {filteredFindings.map((finding, index) => (
            <FindingCard
              key={`${finding.rule_id}-${finding.location.path}-${index}`}
              finding={finding}
            />
          ))}
        </section>
      ) : (
        <section className="border px-5 py-4 bg-emerald-50 border-emerald-200">
          <p className="text-emerald-700 font-serif text-[15px] m-0">
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
      <div className="mt-1 font-display text-[22px] leading-none text-foreground">{value}</div>
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
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {getAuditCategoryLabel(finding.category)}
            </span>
          </div>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            {m.skill_audit_finding_line()} {finding.location.startLine}
          </span>
        </div>
        <p className="mt-3 text-balance text-foreground font-display text-[clamp(18px,2.5vw,22px)] font-normal leading-[1.1] tracking-[-0.01em]">
          {finding.message}
        </p>
      </div>

      <div className="grid gap-3 border-b border-border/50 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5 bg-[var(--background)/0.35]">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {m.skill_audit_finding_source()}
          </div>
          <div className="mt-1.5 font-mono text-[12px] text-foreground">
            {formatLocation(finding.location)}
          </div>
        </div>
        <div className="sm:text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {m.skill_audit_finding_rule()}
          </div>
          <div className="mt-1.5 font-mono text-[12px] text-foreground">{finding.rule_id}</div>
        </div>
      </div>

      {finding.location.snippet && (
        <div className="border-b border-border/50 bg-muted/40 px-4 py-3 sm:px-5">
          <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground">
            <span className="mr-4 select-none text-muted-foreground">
              {finding.location.startLine}
            </span>
            {finding.location.snippet.trim()}
          </pre>
        </div>
      )}

      <div className="px-4 py-4 sm:px-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {m.skill_audit_finding_evidence()}
        </div>
        <p className="mt-2 text-foreground font-serif text-[15px] leading-[1.65]">
          {finding.evidence}
        </p>
        {finding.fix && (
          <>
            <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {m.skill_audit_finding_suggested_fix()}
            </div>
            <p className="mt-2 text-muted-foreground font-serif text-[15px] leading-[1.65]">
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
            <div className="mb-2 h-2 w-20 animate-pulse rounded-none bg-border" />
            <div className="h-6 w-14 animate-pulse rounded-none bg-border" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-full max-w-lg animate-pulse rounded-none bg-border" />
        <div className="h-3.5 w-3/4 animate-pulse rounded-none bg-border" />
        <div className="h-3.5 w-1/2 animate-pulse rounded-none bg-border" />
      </div>
      <div>
        <div className="mb-1.5 h-2 w-28 animate-pulse rounded-none bg-border" />
        <div className="mb-4 h-7 w-40 animate-pulse rounded-none bg-border" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse border p-3 bg-muted border-border" />
          ))}
        </div>
      </div>
      <div className="h-24 animate-pulse border border-border p-4 bg-muted" />
    </div>
  );
}

function WarningIcon() {
  return <span aria-hidden>!</span>;
}

function CheckIcon() {
  return <span aria-hidden>✓</span>;
}
