import type { AuthSession } from "./index";

export const DEV_TEST_USER_ID = "test-user" as const;

export const createDevTestSession = (): NonNullable<AuthSession> => ({
  session: {
    expiresAt: new Date("2099-01-01"),
    id: "test-session",
    userId: DEV_TEST_USER_ID,
  },
  user: {
    email: "test@skills.re",
    id: DEV_TEST_USER_ID,
    image: null,
    name: "Test User",
    role: "admin",
  },
});

export const createDevTestSessionResponse = () => ({
  data: createDevTestSession(),
  error: null,
});

export const resolveDevTestSession = (
  session: AuthSession,
  devTestUserEnabled: boolean,
): AuthSession => session ?? (devTestUserEnabled ? createDevTestSession() : null);

export const resolveDevTestSessionResponse = <
  TSession extends { data: unknown; error: unknown } | null,
>(
  session: TSession,
  devTestUserEnabled: boolean,
): TSession | ReturnType<typeof createDevTestSessionResponse> | null =>
  // oxlint-disable-next-line no-nested-ternary
  session?.data ? session : devTestUserEnabled ? createDevTestSessionResponse() : null;
