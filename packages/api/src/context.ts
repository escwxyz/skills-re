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
  const auth = createRuntimeAuth();
  const { headers } = context.req.raw;
  const apiKey = headers.get("x-api-key");
  const [session, verifiedApiKey] = await Promise.all([
    auth.api.getSession({ headers }),
    apiKey
      ? auth.api.verifyApiKey({
          body: {
            key: apiKey,
            permissions: {
              skills: ["read", "library"],
            },
          },
        })
      : null,
  ]);

  return {
    apiKey:
      verifiedApiKey?.valid && verifiedApiKey.key
        ? { userId: verifiedApiKey.key.referenceId }
        : null,
    auth: null,
    requestHeaders: headers,
    revokeSession: async () => {
      await auth.api.signOut({ asResponse: true, headers });
    },
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
