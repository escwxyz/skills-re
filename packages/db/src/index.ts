import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

export function createLocalDb(options?: {
  authToken?: string;
  url?: string;
}) {
  const client = createClient({
    authToken: options?.authToken,
    url: options?.url ?? "file:./.better-auth.db",
  });

  return drizzle(client, { schema });
}
