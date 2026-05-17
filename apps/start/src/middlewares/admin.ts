import { createMiddleware } from "@tanstack/react-start";
import type { authClient } from "@/lib/auth-client";

type SessionResponse = {
  data: typeof authClient.$Infer.Session;
  error: null;
} | null;

export const adminMiddleware = createMiddleware().server(({ next, context }) => {
  const { session } = context as { session?: SessionResponse };

  if (!session?.data?.user || session.data.user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return next();
});
