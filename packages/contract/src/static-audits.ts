import { z } from "zod";

import { baseContract } from "./common/base";

export const staticAuditSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

export const staticAuditCategorySchema = z.enum([
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
]);

export const staticAuditFindingSchema = z.object({
  category: staticAuditCategorySchema,
  confidence: z.number().min(0).max(1),
  evidence: z.string().min(1),
  fix: z.string().optional(),
  location: z.object({
    endLine: z.number().int().positive().optional(),
    path: z.string().min(1),
    startLine: z.number().int().positive(),
  }),
  message: z.string().min(1),
  rule_id: z.string().min(1),
  severity: staticAuditSeveritySchema,
  source: z.enum(["rule", "llm", "hybrid"]),
});

const staticAuditProviderSchema = z.object({
  llm: z
    .object({
      consensus_runs: z.number().int().positive().optional(),
      enabled: z.boolean(),
      model: z.string().min(1).optional(),
      provider: z.string().min(1).optional(),
    })
    .optional(),
  name: z.string().min(1),
  outputs: z
    .object({
      audit_sarif_path: z.string().min(1).optional(),
    })
    .optional(),
  policy: z.string().min(1).optional(),
  scanner_version: z.string().min(1).optional(),
  summary: z
    .object({
      findings_count: z.number().int().nonnegative(),
      highest_severity: staticAuditSeveritySchema.optional(),
    })
    .optional(),
  virustotal: z
    .object({
      enabled: z.boolean(),
      upload_files: z.boolean().optional(),
    })
    .optional(),
});

export const staticAuditReportSchema = z.object({
  artifacts: z
    .object({
      report_markdown: z.string().optional(),
    })
    .optional(),
  evaluation: z.object({
    is_blocked: z.boolean(),
    overall_score: z.number().int().min(0).max(100),
    risk_level: z.enum(["safe", "low", "medium", "high", "critical"]),
    safe_to_publish: z.boolean(),
    status: z.enum(["pass", "fail"]),
  }),
  meta: z.object({
    generated_at: z.string().datetime({ offset: true }),
    model_version: z.string().optional(),
    pipeline: z.string().min(1),
    pipeline_run_id: z.string().min(1),
    rules_version: z.string().min(1),
    source_hash: z.string().min(1),
    source_ref: z.string().optional(),
    source_type: z.string().min(1),
    tree_hash: z.string().optional(),
  }),
  provider: staticAuditProviderSchema.optional(),
  security_audit: z.object({
    files_scanned: z.number().int().nonnegative(),
    findings: z.array(staticAuditFindingSchema),
    risk_factors: z.array(z.string()),
    summary: z.string().min(1),
    total_lines: z.number().int().nonnegative(),
  }),
  target: z.object({
    entry_path: z.string().optional(),
    owner: z.string().min(1),
    repo: z.string().min(1),
    skill_root_path: z.string().optional(),
    snapshot_id: z.string().min(1).optional(),
  }),
  timings: z.record(z.string(), z.number().nonnegative()).optional(),
});

const staticAuditReportOutputSchema = z.object({
  auditId: z.string(),
  findings: z.array(staticAuditFindingSchema),
  generatedAt: z.string(),
  isBlocked: z.boolean(),
  overallScore: z.number().int().nonnegative(),
  reportMarkdown: z.string().optional(),
  reportR2Key: z.string().optional(),
  riskLevel: staticAuditSeveritySchema,
  safeToPublish: z.boolean(),
  scanner: z.object({
    filesScanned: z.number().int().nonnegative(),
    findingsCount: z.number().int().nonnegative(),
    highestSeverity: staticAuditSeveritySchema.optional(),
    llmProvider: z.string().optional(),
    model: z.string().optional(),
    policy: z.string().optional(),
    providerName: z.string(),
    scannerVersion: z.string().optional(),
    totalLines: z.number().int().nonnegative(),
  }),
  status: z.enum(["pass", "fail"]),
  summary: z.string(),
  syncTime: z.number().int().nonnegative(),
});

export const staticAuditsContract = {
  getReportBySnapshot: baseContract
    .route({
      description: "Returns the latest static audit report for a snapshot.",
      method: "POST",
      path: "/static-audits/report-by-snapshot",
      tags: ["Static Audits"],
      successDescription: "Static audit report",
      summary: "Read static audit report by snapshot",
    })
    .input(
      z.object({
        snapshotId: z.string().min(1),
      }),
    )
    .output(staticAuditReportOutputSchema.nullable()),
};

export type StaticAuditsContract = typeof staticAuditsContract;
export type StaticAuditReport = z.infer<typeof staticAuditReportSchema>;
