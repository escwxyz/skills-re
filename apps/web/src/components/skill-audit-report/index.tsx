"use client";

import { useEffect, useState } from "react";
import { orpc } from "@/lib/orpc";

type StaticAuditCategory =
  | "execution"
  | "data_exfiltration"
  | "credentials"
  | "supply_chain"
  | "persistence"
  | "network"
  | "filesystem"
  | "obfuscation"
  | "hidden_helpers"
  | "prompt_injection";

type StaticAuditSeverity = "critical" | "high" | "medium" | "low";

interface StaticAuditFinding {
  category: StaticAuditCategory;
  confidence: number;
  evidence: string;
  fix?: string;
  location: { endLine?: number; path: string; startLine: number };
  message: string;
  rule_id: string;
  severity: StaticAuditSeverity;
  source: "rule" | "llm" | "hybrid";
}

interface StaticAuditReport {
  auditId: string;
  findings: StaticAuditFinding[];
  generatedAt: string;
  isBlocked: boolean;
  overallScore: number;
  riskLevel: string;
  safeToPublish: boolean;
  scanner: {
    filesScanned: number;
    findingsCount: number;
    highestSeverity?: string;
    llmProvider?: string;
    model?: string;
    policy?: string;
    providerName: string;
    scannerVersion?: string;
    totalLines: number;
  };
  status: "pass" | "fail";
  summary: string;
  syncTime: number;
}

interface Props {
  snapshotId: string | null;
  version?: string;
}

const CATEGORY_LABELS: Record<StaticAuditCategory, string> = {
  credentials: "Credential Access",
  data_exfiltration: "Data Exfiltration",
  execution: "Command Execution",
  filesystem: "Sensitive File Access",
  hidden_helpers: "Hidden Helpers",
  network: "External Calls",
  obfuscation: "Obfuscation",
  persistence: "Persistence",
  prompt_injection: "Prompt Injection",
  supply_chain: "Supply Chain",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as StaticAuditCategory[];

const SEVERITY_COLORS: Record<StaticAuditSeverity, { badge: string; card: string; text: string }> =
  {
    critical: {
      badge: "border-[#b23314] text-[#b23314]",
      card: "border-[#b23314]/25 bg-[#b23314]/5",
      text: "text-[#b23314]",
    },
    high: {
      badge: "border-[#b06d15] text-[#b06d15]",
      card: "border-[#b06d15]/25 bg-[#b06d15]/5",
      text: "text-[#b06d15]",
    },
    low: {
      badge: "border-[var(--editorial-blue)] text-[var(--editorial-blue)]",
      card: "border-[var(--editorial-blue)]/20 bg-[var(--editorial-blue)]/5",
      text: "text-[var(--editorial-blue)]",
    },
    medium: {
      badge: "border-[#a08020] text-[#a08020]",
      card: "border-[#a08020]/25 bg-[#a08020]/5",
      text: "text-[#a08020]",
    },
  };

const formatLocation = (loc: { endLine?: number; path: string; startLine: number }) =>
  `${loc.path}:${loc.endLine ? `${loc.startLine}–${loc.endLine}` : loc.startLine}`;

const getCategoryCounts = (findings: StaticAuditFinding[]) => {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<
    StaticAuditCategory,
    number
  >;
  for (const f of findings) counts[f.category] += 1;
  return counts;
};

const getSeverityCounts = (findings: StaticAuditFinding[]) => {
  const counts: Record<StaticAuditSeverity, number> = {
    critical: 0,
    high: 0,
    low: 0,
    medium: 0,
  };
  for (const f of findings) counts[f.severity] += 1;
  return counts;
};

export function SkillAuditReport({ snapshotId, version }: Props) {
  const [report, setReport] = useState<StaticAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!snapshotId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    orpc.staticAudits
      .getReportBySnapshot({ snapshotId })
      .then((data) => {
        setReport(data as StaticAuditReport | null);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [snapshotId]);

  return (
    <div
      className="border border-(--rule)"
      style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}
    >
      {/* Header */}
      <div
        className="border-b border-(--rule) px-5 py-3.5"
        style={{
          background: "var(--paper-2)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--muted-text)",
        }}
      >
        Static Audit Report{version ? ` · v${version}` : ""}
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-8">
        {loading && (
          <p
            style={{
              color: "var(--muted-text)",
              fontFamily: "var(--font-serif)",
              fontSize: "15px",
            }}
          >
            Loading audit report…
          </p>
        )}

        {error && (
          <p
            style={{
              color: "var(--editorial-red)",
              fontFamily: "var(--font-serif)",
              fontSize: "15px",
            }}
          >
            Failed to load audit report.
          </p>
        )}

        {!loading && !error && !report && (
          <p
            style={{
              color: "var(--muted-text)",
              fontFamily: "var(--font-serif)",
              fontSize: "15px",
            }}
          >
            Audit report queued or still running — check back shortly.
          </p>
        )}

        {!loading && !error && report && <AuditPanel report={report} />}
      </div>
    </div>
  );
}

function AuditPanel({ report }: { report: StaticAuditReport }) {
  const categoryCounts = getCategoryCounts(report.findings);
  const severityCounts = getSeverityCounts(report.findings);
  const severityOrder: StaticAuditSeverity[] = ["critical", "high", "medium", "low"];

  return (
    <div className="space-y-8">
      {/* Summary strip */}
      <div className="grid grid-cols-2 border border-(--rule) sm:grid-cols-4">
        <SummaryCell label="Overall Score" value={`${report.overallScore}/100`} mono />
        <SummaryCell label="Risk Level" value={report.riskLevel} mono />
        <SummaryCell label="Files Scanned" value={String(report.scanner.filesScanned)} mono />
        <SummaryCell label="Total Lines" value={String(report.scanner.totalLines)} mono />
      </div>

      {/* Scanner meta */}
      {report.scanner.providerName && (
        <p style={{ color: "var(--muted-text)", letterSpacing: "0.06em", fontSize: "10.5px" }}>
          Scanner:{" "}
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>
            {report.scanner.providerName}
          </span>
          {report.scanner.scannerVersion && ` · v${report.scanner.scannerVersion}`}
          {report.scanner.model && ` · ${report.scanner.model}`}
        </p>
      )}

      {/* Summary prose */}
      {report.summary && (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "15px",
            lineHeight: "1.6",
            color: "var(--ink-2)",
            maxWidth: "680px",
          }}
        >
          {report.summary}
        </p>
      )}

      {/* Coverage map */}
      <section>
        <div
          style={{
            color: "var(--muted-text)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "6px",
            fontSize: "10px",
          }}
        >
          Categories Tested
        </div>
        <h3
          className="mb-4"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(22px,3vw,28px)",
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: "-0.01em",
          }}
        >
          Coverage Map
        </h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat];
            const isActive = count > 0;
            return (
              <div
                key={cat}
                className="border p-3"
                style={{
                  borderColor: isActive ? "rgba(160,128,32,0.4)" : "var(--rule)",
                  background: isActive ? "rgba(160,128,32,0.06)" : "var(--paper-2)",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex size-7 shrink-0 items-center justify-center border"
                    style={{
                      borderColor: isActive ? "rgba(160,128,32,0.4)" : "rgba(45,90,61,0.4)",
                      color: isActive ? "#a08020" : "var(--editorial-green)",
                    }}
                  >
                    {isActive ? <WarningIcon /> : <CheckIcon />}
                  </div>
                  {isActive && (
                    <span
                      className="border px-1.5 py-0.5 font-mono text-[9px] leading-none"
                      style={{
                        borderColor: "rgba(160,128,32,0.35)",
                        color: "#a08020",
                        background: "rgba(160,128,32,0.1)",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </div>
                <div
                  className="mt-3 text-[12px] leading-[1.3]"
                  style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
                >
                  {CATEGORY_LABELS[cat]}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Security issues section */}
      <section className="border border-(--rule) p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div
              style={{
                color: "var(--muted-text)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontSize: "10px",
                marginBottom: "8px",
              }}
            >
              Security Issues
            </div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px,4vw,40px)",
                fontWeight: 400,
                lineHeight: 1,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
              }}
            >
              {report.findings.length === 0
                ? "No active findings"
                : `${report.findings.length} issue${report.findings.length === 1 ? "" : "s"} to review`}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {severityOrder.map((sev) =>
              severityCounts[sev] > 0 ? (
                <span
                  key={sev}
                  className={`border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase ${SEVERITY_COLORS[sev].badge}`}
                >
                  {severityCounts[sev]} {sev}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </section>

      {/* Finding cards */}
      {report.findings.length > 0 ? (
        <section className="space-y-4">
          {report.findings.map((finding, i) => (
            <FindingCard
              key={`${finding.rule_id}-${finding.location.path}-${i}`}
              finding={finding}
            />
          ))}
        </section>
      ) : (
        <section
          className="border px-5 py-4"
          style={{ borderColor: "rgba(45,90,61,0.3)", background: "rgba(45,90,61,0.05)" }}
        >
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "15px",
              color: "var(--editorial-green)",
              margin: 0,
            }}
          >
            This snapshot passed the static audit without any reported issues.
          </p>
        </section>
      )}
    </div>
  );
}

function FindingCard({ finding }: { finding: StaticAuditFinding }) {
  const colors = SEVERITY_COLORS[finding.severity];
  return (
    <article className={`overflow-hidden border ${colors.card}`}>
      {/* Finding header */}
      <div className="border-b border-(--rule)/50 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase ${colors.badge}`}
            >
              {finding.severity}
            </span>
            <span
              className="font-mono text-[11px] tracking-[0.14em] uppercase"
              style={{ color: "var(--muted-text)" }}
            >
              {CATEGORY_LABELS[finding.category]}
            </span>
          </div>
          <span
            className="font-mono text-[10.5px] uppercase tracking-[0.14em]"
            style={{ color: "var(--muted-text)" }}
          >
            Line {finding.location.startLine}
          </span>
        </div>
        <p
          className="mt-3 text-balance"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(18px,2.5vw,22px)",
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
          }}
        >
          {finding.message}
        </p>
      </div>

      {/* Source + Rule row */}
      <div
        className="grid gap-3 border-b border-(--rule)/50 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5"
        style={{ background: "var(--paper)/0.35" }}
      >
        <div>
          <div
            className="font-mono text-[10px] tracking-[0.16em] uppercase"
            style={{ color: "var(--muted-text)" }}
          >
            Source
          </div>
          <div className="mt-1.5 font-mono text-[12px]" style={{ color: "var(--ink)" }}>
            {formatLocation(finding.location)}
          </div>
        </div>
        <div className="sm:text-right">
          <div
            className="font-mono text-[10px] tracking-[0.16em] uppercase"
            style={{ color: "var(--muted-text)" }}
          >
            Rule
          </div>
          <div className="mt-1.5 font-mono text-[12px]" style={{ color: "var(--ink)" }}>
            {finding.rule_id}
          </div>
        </div>
      </div>

      {/* Evidence + Fix */}
      <div className="px-4 py-4 sm:px-5">
        <div
          className="font-mono text-[10px] tracking-[0.18em] uppercase"
          style={{ color: "var(--muted-text)" }}
        >
          Evidence
        </div>
        <p
          className="mt-2"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "15px",
            lineHeight: "1.65",
            color: "var(--ink)",
          }}
        >
          {finding.evidence}
        </p>
        {finding.fix && (
          <>
            <div
              className="mt-4 font-mono text-[10px] tracking-[0.18em] uppercase"
              style={{ color: "var(--muted-text)" }}
            >
              Suggested Fix
            </div>
            <p
              className="mt-2"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "15px",
                lineHeight: "1.65",
                color: "var(--ink-2)",
              }}
            >
              {finding.fix}
            </p>
          </>
        )}
      </div>
    </article>
  );
}

function SummaryCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-r border-(--rule) px-4 py-3.5 last:border-r-0">
      <div
        className="font-mono text-[9.5px] tracking-[0.16em] uppercase"
        style={{ color: "var(--muted-text)" }}
      >
        {label}
      </div>
      <div
        className="mt-1.5"
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-display)",
          fontSize: mono ? "14px" : "18px",
          lineHeight: 1,
          color: "var(--ink)",
          fontWeight: mono ? 500 : 400,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="m2.5 6.2 2.1 2.1L9.5 3.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M6 1.5 10.4 9a.8.8 0 0 1-.7 1.2H2.3A.8.8 0 0 1 1.6 9L6 1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 4v2.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="6" cy="8.4" r=".7" fill="currentColor" />
    </svg>
  );
}
