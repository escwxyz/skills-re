import { createRuntimeAuth } from "@skills-re/auth/runtime";
import { resolveDevTestSession } from "@skills-re/auth/dev-session";
import type { Context as HonoContext } from "hono";

type CloudflareBindings = Env;

export interface CreateContextOptions<
  Variables extends Record<string, unknown> = Record<string, never>,
> {
  context: HonoContext<{
    Bindings: CloudflareBindings;
    Variables: Variables;
  }>;
}

export async function createContext<
  Variables extends Record<string, unknown> = Record<string, never>,
>({ context }: CreateContextOptions<Variables>) {
  const auth = createRuntimeAuth();
  const { headers } = context.req.raw;
  const session = await auth.api.getSession({ headers });
  const testUserEnabled = context.env.TEST_USER === "true";
  return {
    auth: null,
    requestHeaders: headers,
    revokeSession: async () => {
      await auth.api.signOut({ asResponse: true, headers });
    },
    session: resolveDevTestSession(session, testUserEnabled),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
