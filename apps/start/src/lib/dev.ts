/**
 * Global test-mode switch for local development.
 *
 * When enabled the app authenticates as the hard-coded "test-user" instead of
 * requiring a real OAuth session. Flip by setting VITE_TEST_USER=false in
 * apps/start/.env, or by building for production (import.meta.env.DEV → false).
 *
 * TODO: remove before shipping.
 */
export const DEV_TEST_USER = import.meta.env.DEV && import.meta.env.VITE_TEST_USER !== "false";
