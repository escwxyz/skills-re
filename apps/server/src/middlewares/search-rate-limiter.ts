import type { MiddlewareHandler } from "hono";
import type { WorkerLogger } from "../worker-logger";
import { createRuntimeAuth } from "@skills-re/auth/runtime";
import type { RateLimitResult } from "@/lib/cloudflare/do";

export const searchRateLimiter: MiddlewareHandler<{
  Bindings: Env;
  Variables: { workerLogger?: WorkerLogger };
}> = async (c, next) => {
  const auth = createRuntimeAuth();
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (session?.user) {
    return next();
  }

  // Only rate-limit actual search queries — filter-only calls (authorHandle, sort, etc.)
  // are used for SSR page rendering and should not be throttled.
  try {
    const body = await c.req.raw.clone().json();
    const query = body?.json?.query ?? body?.query; // oRPC: body.json.query, OpenAPI: body.query
    if (!query) {return next();}
  } catch {
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
    // Cast needed: alchemy wraps the DO namespace with Rpc.DurableObjectBranded causing TS2589
    // oxlint-disable-next-line typescript/no-explicit-any
    const ns = c.env.SEARCH_RATE_LIMITER as any;
    const doId = ns.idFromName(ip);
    const stub = ns.get(doId);
    const response = (await stub.fetch(
      new Request("https://rate-limiter/check", { method: "POST" }),
    )) as Response;
    if (response.ok) {
      result = (await response.json()) as RateLimitResult;
    } else {
      c.get("workerLogger")?.warn("search-rate-limiter: non-OK response", {
        status: response.status,
      });
    }
  } catch (error) {
    c.get("workerLogger")?.error("search-rate-limiter: limiter unavailable", {
      error: error instanceof Error ? error : undefined,
    });
  }

  if (result !== null && !result.allowed) {
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
