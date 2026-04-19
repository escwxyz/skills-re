import { createRuntimeAuth } from "@skills-re/auth/runtime";
import type { Context as HonoContext } from "hono";

type CloudflareBindings = Env;

export interface CreateContextOptions {
  context: HonoContext<{ Bindings: CloudflareBindings }>;
}

export async function createContext({ context }: CreateContextOptions) {
  const session = await createRuntimeAuth().api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    auth: null,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
