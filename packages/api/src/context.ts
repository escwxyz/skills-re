import { createRuntimeAuth } from "@skills-re/auth/runtime";
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
  const session = await createRuntimeAuth().api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    auth: null,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
