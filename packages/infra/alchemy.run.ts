// oxlint-disable typescript/no-non-null-assertion
import alchemy from "alchemy";
import {
  AnalyticsEngineDataset,
  Astro,
  D1Database,
  Queue,
  R2Bucket,
  Workflow,
  Worker,
} from "alchemy/cloudflare";

import { GitHubComment } from "alchemy/github";

import { CloudflareStateStore } from "alchemy/state";

import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const app = await alchemy("skills-re", {
  adopt: process.env.NODE_ENV === "production",
  stateStore:
    process.env.NODE_ENV === "production" ? (scope) => new CloudflareStateStore(scope) : undefined,
});

const db = await D1Database("database", {
  migrationsDir: "../../packages/db/src/migrations",
  adopt: true,
});

const snapshotFilesBucket = await R2Bucket("SNAPSHOT_FILES", {
  name: "skills-re-snapshots",
  adopt: true,
  dev: {
    remote: true,
  },
});

const archiveFilesBucket = await R2Bucket("ARCHIVE_FILES", {
  name: "skills-re-archives",
  adopt: true,
  dev: {
    remote: true,
  },
});

const downloadEventsDataset = AnalyticsEngineDataset("DOWNLOAD_EVENTS", {
  dataset: "skills_re_download_events",
});

// Legacy queues – owned by the skills.re worker; kept here so Alchemy does not delete them.
// DO NOT add these as eventSources for the server worker below.
// const _legacyEvaluationWorkflowQueue = await Queue("EVALUATION_WORKFLOW_QUEUE", {
//   name: "skills-re-evaluation-workflow",
//   adopt: true,
// });
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

// New queues for this worker (skills-re-server-prod). Fresh Cloudflare IDs, no consumer conflicts.
// const evaluationWorkflowQueue = await Queue("EVALUATION_WORKFLOW_QUEUE_V1", {
//   name: "skills-re-v1-evaluation-workflow",
// });

const repoStatsSyncWorkflowQueue = await Queue("REPO_STATS_SYNC_WORKFLOW_QUEUE_V1", {
  name: "skills-re-v1-repo-sync-workflow",
});

const repoSnapshotSyncWorkflowQueue = await Queue("REPO_SNAPSHOT_SYNC_WORKFLOW_QUEUE_V1", {
  name: "skills-re-v1-repo-snapshot-sync-workflow",
});

const skillsUploadWorkflowQueue = await Queue("SKILLS_UPLOAD_WORKFLOW_QUEUE_V1", {
  name: "skills-re-v1-skills-upload-workflow",
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

const workflowQueueEventSources = [
  // {
  //   queue: evaluationWorkflowQueue,
  //   settings: {
  //     batchSize: 5,
  //     maxWaitTimeMs: 2000,
  //   },
  // },
  {
    queue: repoSnapshotSyncWorkflowQueue,
    settings: {
      batchSize: 3,
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
    queue: snapshotsArchiveUploadWorkflowQueue,
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
  // EVALUATION_WORKFLOW: Workflow("EVALUATION_WORKFLOW", {
  //   className: "EvaluationWorkflow",
  //   workflowName: "skills-re-evaluation",
  // }),
  REPO_SNAPSHOT_SYNC_WORKFLOW: Workflow("REPO_SNAPSHOT_SYNC_WORKFLOW", {
    className: "RepoSnapshotSyncWorkflow",
    workflowName: "skills-re-v1-repo-snapshot-sync",
  }),
  REPO_STATS_SYNC_WORKFLOW: Workflow("REPO_STATS_SYNC_WORKFLOW", {
    className: "RepoStatsSyncWorkflow",
    workflowName: "skills-re-v1-repo-sync",
  }),
  SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW: Workflow("SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW", {
    className: "SnapshotsArchiveUploadWorkflow",
    workflowName: "skills-re-v1-snapshots-archive-upload",
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
  // EVALUATION_WORKFLOW_QUEUE: evaluationWorkflowQueue,
  REPO_SNAPSHOT_SYNC_WORKFLOW_QUEUE: repoSnapshotSyncWorkflowQueue,
  REPO_STATS_SYNC_WORKFLOW_QUEUE: repoStatsSyncWorkflowQueue,
  SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW_QUEUE: snapshotsArchiveUploadWorkflowQueue,
  SKILLS_CATEGORIZATION_WORKFLOW_QUEUE: skillsCategorizationWorkflowQueue,
  SKILLS_TAGGING_WORKFLOW_QUEUE: skillsTaggingWorkflowQueue,
  SKILLS_UPLOAD_WORKFLOW_QUEUE: skillsUploadWorkflowQueue,
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
  bindings: {
    ADMIN: alchemy.env.ADMIN!,
    DB: db,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
    GH_PAT: alchemy.secret.env.GH_PAT!,
    GITHUB_CLIENT_ID: alchemy.env.GH_CLIENT_ID ?? alchemy.env.GITHUB_CLIENT_ID!,
    GITHUB_CLIENT_SECRET:
      alchemy.secret.env.GH_CLIENT_SECRET ?? alchemy.secret.env.GITHUB_CLIENT_SECRET!,
    GOOGLE_CLIENT_ID: alchemy.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: alchemy.secret.env.GOOGLE_CLIENT_SECRET!,
    ARCHIVE_FILES: archiveFilesBucket,
    DOWNLOAD_EVENTS: downloadEventsDataset,
    RESEND_API_KEY: alchemy.secret.env.RESEND_API_KEY!,
    SNAPSHOT_FILES: snapshotFilesBucket,
    CLOUDFLARE_ACCOUNT_ID: alchemy.env.CLOUDFLARE_ACCOUNT_ID!,
    CLOUDFLARE_API_TOKEN: alchemy.secret.env.CLOUDFLARE_API_TOKEN!,
    CLOUDFLARE_GATEWAY: alchemy.env.CLOUDFLARE_GATEWAY!,
    SKILL_AUDIT_GITHUB_REPO: alchemy.env.SKILL_AUDIT_GITHUB_REPO ?? "",
    SKILL_AUDIT_GITHUB_WORKFLOW_FILE: alchemy.env.SKILL_AUDIT_GITHUB_WORKFLOW_FILE ?? "",
    SKILL_AUDIT_GITHUB_WORKFLOW_REF: alchemy.env.SKILL_AUDIT_GITHUB_WORKFLOW_REF ?? "",
    ...workflowBindings,
    ...workflowQueueBindings,
  },
  eventSources: workflowQueueEventSources,
  dev: {
    port: 3000,
  },
});

export const web = await Astro("web", {
  cwd: "../../apps/web",
  entrypoint: "dist/server/entry.mjs",
  assets: "dist/client",
  compatibility: "node",
  compatibilityDate: "2026-03-10",
  bindings: {
    PUBLIC_SERVER_URL: server.url!,
  },
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

if (process.env.PULL_REQUEST) {
  // if this is a PR, add a comment to the PR with the preview URL
  // it will auto-update with each push
  await GitHubComment("preview-comment", {
    owner: "escwxyz",
    repository: "skills-re",
    issueNumber: Number(process.env.PULL_REQUEST),
    body: `## 🚀 Preview Deployed

Your changes have been deployed to a preview environment:

**🌐 Website:** ${web.url}

Built from commit ${process.env.GITHUB_SHA?.slice(0, 7)}

+---
<sub>🤖 This comment updates automatically with each push.</sub>`,
  });
}

await app.finalize();
