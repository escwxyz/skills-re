// oxlint-disable prefer-destructuring
import { isSkillEvalSandboxEnabled } from "./runtime";
import { readSkillEvalRunEvents } from "./event-writer";
import type { SkillEvalR2Bucket } from "./event-writer";

export interface SkillEvalStreamEnv {
  SKILL_EVAL_SANDBOX_ENABLED?: string;
}

export interface SkillEvalStreamSession {
  user?: {
    id?: string;
  };
}

export type SkillEvalStreamAuthorizeRun = (input: {
  runId: string;
  userId: string;
}) => Promise<"authorized" | "forbidden" | "not_found">;

export interface SkillEvalStreamDeps {
  authorizeRun: SkillEvalStreamAuthorizeRun;
  getSession: (request: Request) => Promise<SkillEvalStreamSession | null>;
}

const jsonError = (status: number, error: string) =>
  Response.json(
    { error },
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      status,
    },
  );

export const authorizeSkillEvalStreamRequest = async (input: {
  deps: SkillEvalStreamDeps;
  env: SkillEvalStreamEnv;
  request: Request;
  runId: string;
}) => {
  const authorization = await authorizeSkillEvalEventReplayRequest(input);
  if (!authorization.ok) {
    return authorization;
  }

  if (input.request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return {
      error: "websocket-upgrade-required",
      ok: false as const,
      status: 426,
    };
  }

  return authorization;
};

export const authorizeSkillEvalEventReplayRequest = async (input: {
  deps: SkillEvalStreamDeps;
  env: SkillEvalStreamEnv;
  request: Request;
  runId: string;
}) => {
  if (!isSkillEvalSandboxEnabled(input.env)) {
    return {
      error: "skill-eval-sandbox-disabled",
      ok: false as const,
      status: 404,
    };
  }

  const session = await input.deps.getSession(input.request);
  const userId = session?.user?.id;
  if (!userId) {
    return {
      error: "unauthorized",
      ok: false as const,
      status: 401,
    };
  }

  const authorization = await input.deps.authorizeRun({
    runId: input.runId,
    userId,
  });
  if (authorization !== "authorized") {
    return {
      error: authorization === "not_found" ? "run-not-found" : "forbidden",
      ok: false as const,
      status: authorization === "not_found" ? 404 : 403,
    };
  }

  return {
    ok: true as const,
    userId,
  };
};

export const createSkillEvalRunStreamResponse = async (input: {
  deps: SkillEvalStreamDeps;
  env: SkillEvalStreamEnv;
  request: Request;
  runId: string;
}) => {
  const authorization = await authorizeSkillEvalStreamRequest(input);
  if (!authorization.ok) {
    return jsonError(authorization.status, authorization.error);
  }

  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];
  server.accept();

  return new Response(null, {
    status: 101,
    webSocket: client,
  } as ResponseInit & { webSocket: WebSocket });
};

export const createSkillEvalRunEventsReplayResponse = async (input: {
  afterSequence?: number;
  artifactPrefix: string;
  bucket: Pick<SkillEvalR2Bucket, "get">;
  deps: SkillEvalStreamDeps;
  env: SkillEvalStreamEnv;
  limit?: number;
  request: Request;
  runId: string;
}) => {
  const authorization = await authorizeSkillEvalEventReplayRequest(input);
  if (!authorization.ok) {
    return jsonError(authorization.status, authorization.error);
  }

  const replay = await readSkillEvalRunEvents({
    afterSequence: input.afterSequence,
    artifactPrefix: input.artifactPrefix,
    bucket: input.bucket,
    limit: input.limit,
  });

  return Response.json(replay, {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
};
