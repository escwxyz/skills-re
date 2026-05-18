import type { MiddlewareHandler } from "hono";
import { createRuntimeAuth } from "@skills-re/auth/runtime";
import { verifyAccessToken } from "better-auth/oauth2";
import type { RateLimitResult } from "@/lib/cloudflare/do";
import type { WorkerLogger } from "../worker-logger";

const isBearerAuthenticated = async (env: Env, headers: Headers): Promise<boolean> => {
  const authorization = headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return false;
  }
  const token = authorization.slice("bearer ".length).trim();
  if (!token) {
    return false;
  }
  try {
    const base = env.PUBLIC_SERVER_URL;
    await verifyAccessToken(token, {
      jwksUrl: `${base}/auth/jwks`,
      verifyOptions: { audience: `${base}/mcp`, issuer: base },
    });
    return true;
  } catch {
    return false;
  }
};

export const mcpRateLimiter: MiddlewareHandler<{
  Bindings: Env;
  Variables: { workerLogger?: WorkerLogger };
}> = async (c, next) => {
  if (c.env.TEST_USER === "true") {
    return next();
  }

  const session = await createRuntimeAuth().api.getSession({ headers: c.req.raw.headers });
  if (session?.user) {
    return next();
  }

  if (await isBearerAuthenticated(c.env, c.req.raw.headers)) {
    return next();
  }

  const ip =
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown";

  // oxlint-disable-next-line typescript/no-explicit-any
  const ns = c.env.MCP_RATE_LIMITER as any;
  const stub = ns.get(ns.idFromName(ip));
  let result: RateLimitResult;
  try {
    const response = (await stub.fetch(
      new Request("https://rate-limiter/check", { method: "POST" }),
    )) as Response;
    result = (await response.json()) as RateLimitResult;
  } catch (error) {
    c.get("workerLogger")?.error("mcp-rate-limiter: limiter unavailable", {
      error: error instanceof Error ? error : undefined,
    });
    return next();
  }

  if (!result.allowed) {
    c.header("Retry-After", String(result.retryAfterSeconds));
    c.get("workerLogger")?.warn("mcp-rate-limiter: rate limited", {
      ip,
      reason: result.reason,
      retryAfterSeconds: result.retryAfterSeconds,
    });
    return c.json(
      {
        code: "RATE_LIMITED",
        message: `MCP rate limit exceeded. Please try again in ${result.retryAfterSeconds} seconds.`,
      },
      429,
    );
  }

  return next();
};
