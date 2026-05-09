import { env } from "@skills-re/env/start";
import { resolveDevTestUserEnabled } from "@skills-re/config/dev";

/**
 * Global test-mode switch for local development.
 *
 * Enabled by default in local dev. Set VITE_TEST_USER=false to force real auth.
 */
export const DEV_TEST_USER = resolveDevTestUserEnabled({
  configuredValue: env.VITE_TEST_USER,
  isProduction: !import.meta.env.DEV,
});
