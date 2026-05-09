import { authMiddleware } from "@/middlewares/auth";
import { createServerFn } from "@tanstack/react-start";
import type { authClient } from "@/lib/auth-client";

interface SessionResponse {
  data: typeof authClient.$Infer.Session;
  error: null;
}

export const getUser = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    const s = context.session as { data: unknown; error: unknown } | null;
    return s?.data ? (context.session as unknown as SessionResponse) : { data: null, error: null };
  });
