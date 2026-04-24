// oxlint-disable promise/prefer-await-to-callbacks
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createServerContext } from "./context";
import { createDownloadMetricsRecorder } from "./download-metrics";
import { createSkillArchiveDownloadResponse } from "./routes/skills-download";
import { appRouter } from "@skills-re/api/routers/index";
import { createRuntimeAuth } from "@skills-re/auth/runtime";
import { env } from "@skills-re/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { processWorkflowQueueBatch } from "./queues/workflow-queue";
import type { WorkflowQueueEnv } from "./queues/workflow-queue";
import { createWorkerLogger } from "./worker-logger";
import type { WorkerLogger } from "./worker-logger";

export { RepoSnapshotSyncWorkflow } from "./workflows/repo-snapshot-sync-workflow";
export { RepoStatsSyncWorkflow } from "./workflows/repo-stats-sync";
export { SnapshotUploadWorkflow } from "./workflows/snapshot-upload-workflow";
export { SnapshotsArchiveUploadWorkflow } from "./workflows/snapshots-archive-upload-workflow";
export { SkillsCategorizationWorkflow } from "./workflows/skills-categorization";
export { SkillsTaggingWorkflow } from "./workflows/skills-tagging";
export { SkillsUploadWorkflow } from "./workflows/skills-upload-workflow";
export { StaticAuditBackfillWorkflow } from "./workflows/static-audit-backfill-workflow";

const AUTH_PREFIX = "/auth";
const RPC_PREFIX = "/rpc";

const normalizeUnknownError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

const app = new Hono<{
  Bindings: Env;
  Variables: {
    workerLogger?: WorkerLogger;
  };
}>();

// Ref: https://honohub.dev/docs/hono-mcp
// const mcpServer = new McpServer({
//   name: "skills-re-mcp",
//   version: "1.0.0",
// });

app.use("/*", async (c, next) => {
  const startedAt = Date.now();
  const requestUrl = new URL(c.req.url);
  const logger = createWorkerLogger({
    component: "http",
    method: c.req.method,
    path: requestUrl.pathname,
    requestId: c.req.header("cf-ray") ?? crypto.randomUUID(),
  });

  c.set("workerLogger", logger);
  logger.info("http.request.started", {
    url: `${requestUrl.origin}${requestUrl.pathname}`,
  });

  try {
    await next();
  } finally {
    logger.info("http.request.completed", {
      durationMs: Date.now() - startedAt,
      status: c.res.status,
    });
  }
});
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
// Better Auth is exposed on the platform API origin at /auth/*.
app.on(["POST", "GET"], `${AUTH_PREFIX}/*`, (c) => createRuntimeAuth().handler(c.req.raw));
app.get("/api/skills/download", async (c) => {
  const url = new URL(c.req.url);
  return await createSkillArchiveDownloadResponse(
    {
      format: url.searchParams.get("format") === "tar.gz" ? "tar.gz" : undefined,
      skillId: url.searchParams.get("skillId") ?? "",
      version: url.searchParams.get("version") ?? "",
    },
    {
      recordSuccessfulSkillDownload: createDownloadMetricsRecorder(
        c.env as {
          DOWNLOAD_EVENTS?: { writeDataPoint(dataPoint: { blobs: [string, string] }): void };
        },
      ),
    },
  );
});

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      docsPath: "/docs",
      specGenerateOptions: {
        info: {
          title: "OpenAPI References",
          version: "1.0.0",
        },
      },
    }),
  ],
  interceptors: [
    onError((error) => {
      createWorkerLogger({ component: "openapi" }).error("orpc.error", {
        error: normalizeUnknownError(error),
      });
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      createWorkerLogger({ component: "rpc" }).error("orpc.error", {
        error: normalizeUnknownError(error),
      });
    }),
  ],
});

// app.all("/mcp", async (c) => {
//   const transport = new StreamableHTTPTransport();
//   await mcpServer.connect(transport);
//   return transport.handleRequest(c);
// });

app.use("/*", async (c, next) => {
  const context = await createServerContext({ context: c });

  // RPC stays separate for the dashboard app and other typed internal consumers.
  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: RPC_PREFIX,
    context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    // prefix: "/api-reference",
    context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.get("/", (c) => c.text("OK"));

const server = {
  fetch: (request: Request, workerEnv: Env, executionContext: ExecutionContext) =>
    app.fetch(request, workerEnv, executionContext),
  async queue(batch: MessageBatch<unknown>, workerEnv: Env) {
    await processWorkflowQueueBatch(batch, workerEnv as WorkflowQueueEnv);
  },
};

export default server satisfies ExportedHandler<Env, unknown>;
