import { authClient } from "@/lib/auth-client";
import { DEV_TEST_USER } from "@/lib/dev";
import { resolveDevTestSessionResponse } from "@skills-re/auth/dev-session";
import { createMiddleware } from "@tanstack/react-start";

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: request.headers,
      throw: false,
    },
  });
  return next({
    context: { session: resolveDevTestSessionResponse(session ?? null, DEV_TEST_USER) },
  });
});
