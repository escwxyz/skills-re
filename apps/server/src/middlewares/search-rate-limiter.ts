import type { MiddlewareHandler } from "hono";
import type { WorkerLogger } from "../worker-logger";
import { createRuntimeAuth } from "@skills-re/auth/runtime";
import type { RateLimitResult } from "@/lib/cloudflare/do";

// oRPC encodes input as { json: { ... } }; OpenAPI sends it flat
async function requestHasQuery(req: Request): Promise<boolean> {
  try {
    // oxlint-disable-next-line typescript/no-explicit-any
    const body = (await req.clone().json()) as any;
    return !!(body?.json?.query ?? body?.query);
  } catch {
    // Non-JSON body (e.g. crafted FormData oRPC request) — fail closed to
    // prevent throttle bypass via alternative oRPC encodings.
    return true;
  }
}

// Cast needed: alchemy wraps the DO namespace with Rpc.DurableObjectBranded causing TS2589
// oxlint-disable-next-line typescript/no-explicit-any
async function checkRateLimit(ns: any, ip: string): Promise<RateLimitResult | null> {
  const stub = ns.get(ns.idFromName(ip));
  const response = (await stub.fetch(
    new Request("https://rate-limiter/check", { method: "POST" }),
  )) as Response;
  return response.ok ? ((await response.json()) as RateLimitResult) : null;
}

export const searchRateLimiter: MiddlewareHandler<{
  Bindings: Env;
  Variables: { workerLogger?: WorkerLogger };
}> = async (c, next) => {
  const session = await createRuntimeAuth().api.getSession({ headers: c.req.raw.headers });
  if (session?.user) {
    return next();
  }

  if (!(await requestHasQuery(c.req.raw))) {
    return next();
  }

  const ip =
    c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For")?.split(",")[0]?.trim();
  if (!ip) {
    c.get("workerLogger")?.warn("search-rate-limiter: missing client IP");
    return next();
  }

  let result: RateLimitResult | null = null;
  try {
    result = await checkRateLimit(c.env.SEARCH_RATE_LIMITER, ip);
  } catch (error) {
    c.get("workerLogger")?.error("search-rate-limiter: limiter unavailable", {
      error: error instanceof Error ? error : undefined,
    });
  }

  if (result && !result.allowed) {
    c.header("Retry-After", String(result.retryAfterSeconds));
    return c.json(
      {
        code: "RATE_LIMITED",
        message: `Search rate limit exceeded. Please try again in ${result.retryAfterSeconds} seconds.`,
      },
      429,
    );
  }

  return next();
};
