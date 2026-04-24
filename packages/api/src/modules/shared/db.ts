import type { createDb as createDbType } from "@skills-re/db/runtime";

type Database = ReturnType<typeof createDbType>;

const createUnavailableDb = (cause: unknown): Database =>
  new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "then") {
          return null;
        }
        throw new Error("Default database binding is unavailable outside Cloudflare Workers.", {
          cause,
        });
      },
    },
  ) as Database;

const createDefaultDb = async (): Promise<Database> => {
  try {
    const { createDb } = await import("@skills-re/db/runtime");
    return createDb();
  } catch (error) {
    return createUnavailableDb(error);
  }
};

export const db = await createDefaultDb();
