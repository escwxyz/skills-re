import { authClient } from "@/lib/auth-client";
import { createMiddleware } from "@tanstack/react-start";

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: request.headers,
      throw: false,
    },
  });
  return next({
    context: { session },
  });
});
