import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_SERVER_URL: z.url(),
  },
  // oxlint-disable-next-line typescript/no-explicit-any
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
