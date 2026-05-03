import type { MiddlewareHandler } from "hono";
import type { WorkerLogger } from "../worker-logger";
import { createRuntimeAuth } from "@skills-re/auth/runtime";
import type { RateLimitResult } from "@/lib/cloudflare/do";

export const submitPublicRateLimiter: MiddlewareHandler<{
  Bindings: Env;
  Variables: { workerLogger?: WorkerLogger };
}> = async (c, next) => {
  const auth = createRuntimeAuth();
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (session?.user) {
    return next();
  }

  const ip =
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown";

  // Cast needed: alchemy wraps the DO namespace with Rpc.DurableObjectBranded causing TS2589
  // oxlint-disable-next-line typescript/no-explicit-any
  const ns = c.env.SUBMIT_RATE_LIMITER as any;
  const doId = ns.idFromName(ip);
  const stub = ns.get(doId);
  const response = (await stub.fetch(
    new Request("https://rate-limiter/check", { method: "POST" }),
  )) as Response;
  const result = (await response.json()) as RateLimitResult;

  if (!result.allowed) {
    if (result.reason === "window_limit") {
      c.header("Retry-After", String(result.retryAfterSeconds));
    }
    const message =
      result.reason === "window_limit"
        ? `Rate limit exceeded. Please try again in ${result.retryAfterSeconds} seconds.`
        : "You have reached the maximum number of skill submissions for unregistered users.";
    return c.json({ code: "RATE_LIMITED", message }, 429);
  }

  return next();
};
