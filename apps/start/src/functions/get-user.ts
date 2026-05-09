import { authMiddleware } from "@/middlewares/auth";
import { createServerFn } from "@tanstack/react-start";
import { DEV_TEST_USER } from "@/lib/dev";
import type { authClient } from "@/lib/auth-client";

interface SessionResponse {
  data: typeof authClient.$Infer.Session;
  error: null;
}

// TODO: remove before shipping — only used when DEV_TEST_USER is enabled
const TEST_SESSION = {
  data: {
    session: { expiresAt: new Date("2099-01-01"), id: "test-session", userId: "test-user" },
    user: {
      email: "test@skills.re",
      id: "test-user",
      image: null as string | null,
      name: "Test User",
      role: "admin" as string,
    },
  },
  error: null,
};

export const getUser = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    const s = context.session as { data: unknown; error: unknown } | null;
    if (s?.data) {
      return context.session as unknown as SessionResponse;
    }
    if (DEV_TEST_USER) {
      return TEST_SESSION as unknown as SessionResponse;
    }
    return { data: null, error: null };
  });
