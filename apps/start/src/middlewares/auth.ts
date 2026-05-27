import { authClient } from "@/lib/auth-client";
import { measureAsync } from "@/lib/dev-performance";
import { createMiddleware } from "@tanstack/react-start";

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) =>
    await measureAsync(
      "middleware.auth.getSession",
      { hasCookieHeader: request.headers.has("cookie") },
      async () => {
        const session = await authClient.getSession({
          fetchOptions: {
            headers: request.headers,
            throw: false,
          },
        });
        return next({ context: { session: session ?? null } });
      },
    ),
);
