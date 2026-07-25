// oxlint-disable typescript/no-non-null-assertion
import alchemy from "alchemy";
import {
  AiSearch,
  AnalyticsEngineDataset,
  D1Database,
  DurableObjectNamespace,
  KVNamespace,
  Queue,
  R2Bucket,
  Workflow,
  Worker,
  TanStackStart,
} from "alchemy/cloudflare";

import { CloudflareStateStore } from "alchemy/state";

import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/start/.env" });
config({ path: "../../apps/server/.env" });

const app = await alchemy("skills-re", {
  adopt: process.env.NODE_ENV === "production",
  stateStore:
    process.env.NODE_ENV === "production" ? (scope) => new CloudflareStateStore(scope) : undefined,
});

const database = await D1Database("database-eu", {
  name: "skills-re-database-eu-prod",
  migrationsDir: "../../packages/db/src/migrations",
  adopt: true,
  jurisdiction: "eu",
  readReplication: {
    mode: "auto",
  },
});

const snapshotFilesBucket = await R2Bucket("skills-re-snapshots", {
  name: "skills-re-snapshots",
  adopt: true,
  dev: {
    remote: true,
  },
});

// Built-in Storage instance — items are uploaded directly via the Items API,
// indexed immediately, and keyed by skillId so updates are idempotent upserts.
const aiSearch = await AiSearch("skills-re-ai-search", {
  name: "skills-re-ai-search",
  adopt: true,
  // https://developers.cloudflare.com/ai-search/configuration/indexing/hybrid-search/
  indexMethod: {
    vector: true,
    keyword: true,
  },
});

const archiveFilesBucket = await R2Bucket("skills-re-archives", {
  name: "skills-re-archives",
  adopt: true,
  dev: {
    remote: true,
  },
});

const skillEvalArtifactsBucket = await R2Bucket("skills-re-skill-eval-artifacts", {
  name: "skills-re-skill-eval-artifacts",
  adopt: true,
  dev: {
    remote: true,
  },
});

const downloadEventsDataset = AnalyticsEngineDataset("DOWNLOAD_EVENTS", {
  dataset: "skills-re-download-events",
});

const viewEventsDataset = AnalyticsEngineDataset("VIEW_EVENTS", {
  dataset: "skills-re-skill-view-events",
});

const metricsCache = await KVNamespace("METRICS_CACHE", {
  title: "skills-re-metrics-cache",
});

const mcpRateLimiterDurableObject = DurableObjectNamespace("mcp-rate-limiter", {
  className: "McpRateLimiter",
});

const submitRateLimiterDurableObject = DurableObjectNamespace("submit-rate-limiter", {
  className: "SubmitRateLimiter",
});

const searchRateLimiterDurableObject = DurableObjectNamespace("search-rate-limiter", {
  className: "SearchRateLimiter",
});

const skillEvalSandboxDurableObject = DurableObjectNamespace("skill-eval-sandbox", {
  className: "Sandbox",
});

const aiSearchUploadRateLimiterDurableObject = DurableObjectNamespace(
  "ai-search-upload-rate-limiter",
  {
    className: "AiSearchUploadRateLimiter",
  },
);

const aiWorkflowRateLimiterDurableObject = DurableObjectNamespace("ai-workflow-rate-limiter", {
  className: "AiWorkflowRateLimiter",
});

const staticAuditDispatchRateLimiterDurableObject = DurableObjectNamespace(
  "static-audit-dispatch-rate-limiter",
  {
    className: "StaticAuditDispatchRateLimiter",
  },
);

await Queue("REPO_STATS_SYNC_WORKFLOW_QUEUE", {
  name: "skills-re-repo-sync-workflow",
  adopt: true,
});
await Queue("REPO_SNAPSHOT_SYNC_WORKFLOW_QUEUE", {
  name: "skills-re-repo-snapshot-sync-workflow",
  adopt: true,
});
await Queue("SKILLS_UPLOAD_WORKFLOW_QUEUE", {
  name: "skills-re-skills-upload-workflow",
  adopt: true,
});
await Queue("SKILLS_TAGGING_WORKFLOW_QUEUE", {
  name: "skills-re-skills-tagging-workflow",
  adopt: true,
});
await Queue("SKILLS_CATEGORIZATION_WORKFLOW_QUEUE", {
  name: "skills-re-skills-categorization-workflow",
  adopt: true,
});
await Queue("SNAPSHOT_UPLOAD_WORKFLOW_QUEUE_0", {
  name: "skills-re-snapshot-upload-workflow-0",
  adopt: true,
});
await Queue("SNAPSHOT_UPLOAD_WORKFLOW_QUEUE_1", {
  name: "skills-re-snapshot-upload-workflow-1",
  adopt: true,
});
await Queue("SNAPSHOT_UPLOAD_WORKFLOW_QUEUE_2", {
  name: "skills-re-snapshot-upload-workflow-2",
  adopt: true,
});
await Queue("SNAPSHOT_UPLOAD_WORKFLOW_QUEUE_3", {
  name: "skills-re-snapshot-upload-workflow-3",
  adopt: true,
});
await Queue("SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW_QUEUE", {
  name: "skills-re-snapshot-archive-upload-workflow",
  adopt: true,
});

const repoStatsSyncWorkflowQueue = await Queue("REPO_STATS_SYNC_WORKFLOW_QUEUE_V1", {
  name: "skills-re-v1-repo-sync-workflow",
});

const repoSkillsDiscoveryWorkflowQueue = await Queue("REPO_SKILLS_DISCOVERY_WORKFLOW_QUEUE_V1", {
  name: "skills-re-v1-repo-skills-discovery-workflow",
});

const repoSkillImportWorkflowQueue = await Queue("REPO_SKILL_IMPORT_WORKFLOW_QUEUE_V1", {
  name: "skills-re-v1-repo-skill-import-workflow",
});

const repoSkillSnapshotSyncWorkflowQueue = await Queue(
  "REPO_SKILL_SNAPSHOT_SYNC_WORKFLOW_QUEUE_V1",
  {
    name: "skills-re-v1-repo-skill-snapshot-sync-workflow",
  },
);

const skillsUploadWorkflowQueue = await Queue("SKILLS_UPLOAD_WORKFLOW_QUEUE_V1", {
  name: "skills-re-v1-skills-upload-workflow",
});

const aiSearchBackfillWorkflowQueue = await Queue("AI_SEARCH_BACKFILL_WORKFLOW_QUEUE_V1", {
  name: "skills-re-v1-ai-search-backfill-workflow",
});

const skillSearchBackfillWorkflowQueue = await Queue("SKILL_SEARCH_BACKFILL_WORKFLOW_QUEUE_V1", {
  name: "skills-re-v1-skill-search-backfill-workflow",
});

const skillsTaggingWorkflowQueue = await Queue("SKILLS_TAGGING_WORKFLOW_QUEUE_V1", {
  name: "skills-re-v1-skills-tagging-workflow",
});

const skillsCategorizationWorkflowQueue = await Queue("SKILLS_CATEGORIZATION_WORKFLOW_QUEUE_V1", {
  name: "skills-re-v1-skills-categorization-workflow",
});

const snapshotUploadWorkflowQueue0 = await Queue("SNAPSHOT_UPLOAD_WORKFLOW_QUEUE_V1_0", {
  name: "skills-re-v1-snapshot-upload-workflow-0",
});

const snapshotUploadWorkflowQueue1 = await Queue("SNAPSHOT_UPLOAD_WORKFLOW_QUEUE_V1_1", {
  name: "skills-re-v1-snapshot-upload-workflow-1",
});

const snapshotUploadWorkflowQueue2 = await Queue("SNAPSHOT_UPLOAD_WORKFLOW_QUEUE_V1_2", {
  name: "skills-re-v1-snapshot-upload-workflow-2",
});

const snapshotUploadWorkflowQueue3 = await Queue("SNAPSHOT_UPLOAD_WORKFLOW_QUEUE_V1_3", {
  name: "skills-re-v1-snapshot-upload-workflow-3",
});

const snapshotsArchiveUploadWorkflowQueue = await Queue(
  "SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW_QUEUE_V1",
  {
    name: "skills-re-v1-snapshot-archive-upload-workflow",
  },
);

const skillEvalRunWorkflowQueue = await Queue("SKILL_EVAL_RUN_WORKFLOW_QUEUE_V1", {
  name: "skills-re-v1-skill-eval-run-workflow",
});

const workflowQueueEventSources = [
  // {
  //   queue: evaluationWorkflowQueue,
  //   settings: {
  //     batchSize: 5,
  //     maxWaitTimeMs: 2000,
  //   },
  // },
  {
    queue: repoSkillsDiscoveryWorkflowQueue,
    settings: {
      batchSize: 2,
      maxWaitTimeMs: 2000,
    },
  },
  {
    queue: repoStatsSyncWorkflowQueue,
    settings: {
      batchSize: 3,
      maxWaitTimeMs: 2000,
    },
  },
  {
    queue: repoSkillImportWorkflowQueue,
    settings: {
      batchSize: 2,
      maxWaitTimeMs: 2000,
    },
  },
  {
    queue: repoSkillSnapshotSyncWorkflowQueue,
    settings: {
      batchSize: 3,
      maxWaitTimeMs: 2000,
    },
  },
  {
    queue: snapshotsArchiveUploadWorkflowQueue,
    settings: {
      batchSize: 1,
      maxWaitTimeMs: 1000,
    },
  },
  {
    queue: skillEvalRunWorkflowQueue,
    settings: {
      batchSize: 1,
      maxWaitTimeMs: 1000,
    },
  },
  {
    queue: skillsCategorizationWorkflowQueue,
    settings: {
      batchSize: 2,
      maxWaitTimeMs: 2000,
    },
  },
  {
    queue: skillsTaggingWorkflowQueue,
    settings: {
      batchSize: 2,
      maxWaitTimeMs: 2000,
    },
  },
  {
    queue: skillsUploadWorkflowQueue,
    settings: {
      batchSize: 1,
      maxWaitTimeMs: 2000,
    },
  },
  {
    queue: aiSearchBackfillWorkflowQueue,
    settings: {
      batchSize: 1,
      maxWaitTimeMs: 2000,
    },
  },
  {
    queue: skillSearchBackfillWorkflowQueue,
    settings: {
      batchSize: 1,
      maxWaitTimeMs: 2000,
    },
  },
  {
    queue: snapshotUploadWorkflowQueue0,
    settings: {
      batchSize: 1,
      maxWaitTimeMs: 1000,
    },
  },
  {
    queue: snapshotUploadWorkflowQueue1,
    settings: {
      batchSize: 1,
      maxWaitTimeMs: 1000,
    },
  },
  {
    queue: snapshotUploadWorkflowQueue2,
    settings: {
      batchSize: 1,
      maxWaitTimeMs: 1000,
    },
  },
  {
    queue: snapshotUploadWorkflowQueue3,
    settings: {
      batchSize: 1,
      maxWaitTimeMs: 1000,
    },
  },
];

const workflowBindings = {
  AI_SEARCH_BACKFILL_WORKFLOW: Workflow("AI_SEARCH_BACKFILL_WORKFLOW", {
    className: "AiSearchBackfillWorkflow",
    workflowName: "skills-re-v1-ai-search-backfill",
  }),
  SKILL_SEARCH_BACKFILL_WORKFLOW: Workflow("SKILL_SEARCH_BACKFILL_WORKFLOW", {
    className: "SkillSearchBackfillWorkflow",
    workflowName: "skills-re-v1-skill-search-backfill",
  }),
  REPO_SNAPSHOT_SYNC_WORKFLOW: Workflow("REPO_SNAPSHOT_SYNC_WORKFLOW", {
    className: "RepoSnapshotSyncWorkflow",
    workflowName: "skills-re-v1-repo-snapshot-sync",
  }),
  REPO_SKILLS_DISCOVERY_WORKFLOW: Workflow("REPO_SKILLS_DISCOVERY_WORKFLOW", {
    className: "RepoSkillsDiscoveryWorkflow",
    workflowName: "skills-re-v1-repo-skills-discovery",
  }),
  REPO_SKILL_IMPORT_WORKFLOW: Workflow("REPO_SKILL_IMPORT_WORKFLOW", {
    className: "RepoSkillImportWorkflow",
    workflowName: "skills-re-v1-repo-skill-import",
  }),
  REPO_SKILL_SNAPSHOT_SYNC_WORKFLOW: Workflow("REPO_SKILL_SNAPSHOT_SYNC_WORKFLOW", {
    className: "RepoSkillSnapshotSyncWorkflow",
    workflowName: "skills-re-v1-repo-skill-snapshot-sync",
  }),
  REPO_STATS_SYNC_WORKFLOW: Workflow("REPO_STATS_SYNC_WORKFLOW", {
    className: "RepoStatsSyncWorkflow",
    workflowName: "skills-re-v1-repo-sync",
  }),
  SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW: Workflow("SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW", {
    className: "SnapshotsArchiveUploadWorkflow",
    workflowName: "skills-re-v1-snapshots-archive-upload",
  }),
  SNAPSHOT_RAW_FILES_BACKFILL_WORKFLOW: Workflow("SNAPSHOT_RAW_FILES_BACKFILL_WORKFLOW", {
    className: "SnapshotRawFilesBackfillWorkflow",
    workflowName: "skills-re-v1-snapshot-raw-files-backfill",
  }),
  SNAPSHOT_UPLOAD_WORKFLOW: Workflow("SNAPSHOT_UPLOAD_WORKFLOW", {
    className: "SnapshotUploadWorkflow",
    workflowName: "skills-re-v1-snapshot-upload",
  }),
  SKILLS_CATEGORIZATION_WORKFLOW: Workflow("SKILLS_CATEGORIZATION_WORKFLOW", {
    className: "SkillsCategorizationWorkflow",
    workflowName: "skills-re-v1-skills-categorization",
  }),
  SKILLS_TAGGING_WORKFLOW: Workflow("SKILLS_TAGGING_WORKFLOW", {
    className: "SkillsTaggingWorkflow",
    workflowName: "skills-re-v1-skills-tagging",
  }),
  SKILLS_UPLOAD_WORKFLOW: Workflow("SKILLS_UPLOAD_WORKFLOW", {
    className: "SkillsUploadWorkflow",
    workflowName: "skills-re-v1-skills-upload",
  }),
  STATIC_AUDIT_BACKFILL_WORKFLOW: Workflow("STATIC_AUDIT_BACKFILL_WORKFLOW", {
    className: "StaticAuditBackfillWorkflow",
    workflowName: "skills-re-v1-static-audit-backfill",
  }),
} as const;

const workflowQueueBindings = {
  REPO_SKILL_IMPORT_WORKFLOW_QUEUE: repoSkillImportWorkflowQueue,
  REPO_SKILL_SNAPSHOT_SYNC_WORKFLOW_QUEUE: repoSkillSnapshotSyncWorkflowQueue,
  REPO_SKILLS_DISCOVERY_WORKFLOW_QUEUE: repoSkillsDiscoveryWorkflowQueue,
  REPO_STATS_SYNC_WORKFLOW_QUEUE: repoStatsSyncWorkflowQueue,
  SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW_QUEUE: snapshotsArchiveUploadWorkflowQueue,
  SKILLS_CATEGORIZATION_WORKFLOW_QUEUE: skillsCategorizationWorkflowQueue,
  SKILLS_TAGGING_WORKFLOW_QUEUE: skillsTaggingWorkflowQueue,
  SKILLS_UPLOAD_WORKFLOW_QUEUE: skillsUploadWorkflowQueue,
  SKILL_EVAL_RUN_WORKFLOW_QUEUE: skillEvalRunWorkflowQueue,
  AI_SEARCH_BACKFILL_WORKFLOW_QUEUE: aiSearchBackfillWorkflowQueue,
  SKILL_SEARCH_BACKFILL_WORKFLOW_QUEUE: skillSearchBackfillWorkflowQueue,
  SNAPSHOT_UPLOAD_WORKFLOW_QUEUE_0: snapshotUploadWorkflowQueue0,
  SNAPSHOT_UPLOAD_WORKFLOW_QUEUE_1: snapshotUploadWorkflowQueue1,
  SNAPSHOT_UPLOAD_WORKFLOW_QUEUE_2: snapshotUploadWorkflowQueue2,
  SNAPSHOT_UPLOAD_WORKFLOW_QUEUE_3: snapshotUploadWorkflowQueue3,
} as const;

export const server = await Worker("server", {
  cwd: "../../apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  compatibilityDate: "2026-03-10",
  placement: {
    mode: "smart",
  },
  crons: [
    // Repo metadata sync only: stars, forks, and GitHub updatedAt.
    "0 */6 * * *",
    // Repo content discovery runs separately after metadata sync.
    "15 */6 * * *",
    // Daily metrics refresh: new skills and snapshots per day.
    "30 0 * * *",
  ],
  bindings: {
    ADMIN: alchemy.env.ADMIN!,
    DB: database,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
    PUBLIC_SERVER_URL: alchemy.env.PUBLIC_SERVER_URL!,
    PUBLIC_SITE_URL: alchemy.env.PUBLIC_SITE_URL!,
    GH_PAT: alchemy.secret.env.GH_PAT!,
    GITHUB_CLIENT_ID: alchemy.env.GH_CLIENT_ID ?? alchemy.env.GITHUB_CLIENT_ID!,
    GITHUB_CLIENT_SECRET:
      alchemy.secret.env.GH_CLIENT_SECRET ?? alchemy.secret.env.GITHUB_CLIENT_SECRET!,
    GOOGLE_CLIENT_ID: alchemy.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: alchemy.secret.env.GOOGLE_CLIENT_SECRET!,
    ARCHIVE_FILES: archiveFilesBucket,
    SKILL_EVAL_ARTIFACTS: skillEvalArtifactsBucket,
    DOWNLOAD_EVENTS: downloadEventsDataset,
    AI_SEARCH: aiSearch,
    RESEND_API_KEY: alchemy.secret.env.RESEND_API_KEY!,
    METRICS_CACHE: metricsCache,
    SNAPSHOT_FILES: snapshotFilesBucket,
    CLOUDFLARE_ACCOUNT_ID: alchemy.env.CLOUDFLARE_ACCOUNT_ID!,
    CLOUDFLARE_AI_GATEWAY_API_TOKEN: alchemy.secret.env.CLOUDFLARE_AI_GATEWAY_API_TOKEN!,
    CLOUDFLARE_GATEWAY: alchemy.env.CLOUDFLARE_GATEWAY!,
    SKILL_AUDIT_GITHUB_REPO: alchemy.env.SKILL_AUDIT_GITHUB_REPO ?? "",
    SKILL_AUDIT_GITHUB_WORKFLOW_FILE: alchemy.env.SKILL_AUDIT_GITHUB_WORKFLOW_FILE ?? "",
    SKILL_AUDIT_GITHUB_WORKFLOW_REF: alchemy.env.SKILL_AUDIT_GITHUB_WORKFLOW_REF ?? "",
    AUTOMATION_API_TOKEN: alchemy.secret.env.AUTOMATION_API_TOKEN!,
    SKILL_EVAL_SANDBOX_ENABLED: alchemy.env.SKILL_EVAL_SANDBOX_ENABLED!,
    SKILL_EVAL_OPENCODE_API_KEY: alchemy.secret.env.SKILL_EVAL_OPENCODE_API_KEY!,
    SKILL_EVAL_OPENCODE_MODEL: alchemy.env.SKILL_EVAL_OPENCODE_MODEL!,
    SKILL_KEYWORD_SEARCH_STRATEGY: alchemy.env.SKILL_KEYWORD_SEARCH_STRATEGY ?? "like",
    AUTH_COOKIE_DOMAIN: alchemy.env.AUTH_COOKIE_DOMAIN ?? "",
    R2_PUBLIC_BASE_URL: alchemy.env.R2_PUBLIC_BASE_URL!,
    R2_ARCHIVE_PUBLIC_BASE_URL: alchemy.env.R2_ARCHIVE_PUBLIC_BASE_URL!,
    VIEW_EVENTS: viewEventsDataset,
    AI_SEARCH_UPLOAD_DAILY_LIMIT: alchemy.env.AI_SEARCH_UPLOAD_DAILY_LIMIT!,
    AI_SEARCH_UPLOAD_RATE_LIMITER: aiSearchUploadRateLimiterDurableObject,
    AI_SEARCH_UPLOAD_SPACING_SECONDS: alchemy.env.AI_SEARCH_UPLOAD_SPACING_SECONDS!,
    AI_WORKFLOW_DAILY_SKILL_LIMIT: alchemy.env.AI_WORKFLOW_DAILY_SKILL_LIMIT!,
    AI_WORKFLOW_RATE_LIMITER: aiWorkflowRateLimiterDurableObject,
    AI_WORKFLOW_SPACING_SECONDS: alchemy.env.AI_WORKFLOW_SPACING_SECONDS!,
    REPO_SKILLS_DISCOVERY_WORKFLOW_DAILY_LIMIT:
      alchemy.env.REPO_SKILLS_DISCOVERY_WORKFLOW_DAILY_LIMIT!,
    REPO_SKILLS_DISCOVERY_WORKFLOW_SPACING_SECONDS:
      alchemy.env.REPO_SKILLS_DISCOVERY_WORKFLOW_SPACING_SECONDS!,
    STATIC_AUDIT_DISPATCH_DAILY_LIMIT: alchemy.env.STATIC_AUDIT_DISPATCH_DAILY_LIMIT!,
    STATIC_AUDIT_DISPATCH_RATE_LIMITER: staticAuditDispatchRateLimiterDurableObject,
    STATIC_AUDIT_DISPATCH_SPACING_SECONDS: alchemy.env.STATIC_AUDIT_DISPATCH_SPACING_SECONDS!,
    MCP_RATE_LIMITER: mcpRateLimiterDurableObject,
    SUBMIT_RATE_LIMITER: submitRateLimiterDurableObject,
    SEARCH_RATE_LIMITER: searchRateLimiterDurableObject,
    SKILL_EVAL_SANDBOX: skillEvalSandboxDurableObject,
    ...workflowBindings,
    ...workflowQueueBindings,
  },
  eventSources: workflowQueueEventSources,
  dev: {
    port: 3000,
  },
});

export const start = await TanStackStart("start", {
  cwd: "../../apps/start",
  compatibility: "node",
  compatibilityDate: "2026-03-10",
  observability: {
    enabled: false,
  },
  // Keep default request-proximate placement for the user-facing Start worker.
  bindings: {
    API: server,
    VITE_SERVER_URL: alchemy.env.PUBLIC_SERVER_URL!,
    VITE_SITE_URL: alchemy.env.PUBLIC_SITE_URL!,
    VITE_CLARITY_PROJECT_ID: alchemy.env.CLARITY_PROJECT_ID!,
    VITE_GA_MEASURE_ID: alchemy.env.GA_MEASURE_ID!,
  },
});

console.log(`Start -> ${start.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
