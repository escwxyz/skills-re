import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SERVER_URL: z.url(),
    VITE_SITE_URL: z.url(),
    // Set to "false" to disable test-user mode even in dev.
    VITE_TEST_USER: z.enum(["true", "false"]).optional(),
  },
  // oxlint-disable-next-line typescript/no-explicit-any
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
