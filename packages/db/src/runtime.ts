import { env } from "@skills-re/env/server";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

export function createDb(database = env.DB) {
  return drizzle(database, { schema });
}
