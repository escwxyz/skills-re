export const AUTOMATION_TOKEN_HEADER = "x-skills-automation-token";

export const verifyAutomationToken = (
  request: Request,
  expectedToken?: string | null,
): { ok: true } | { ok: false; response: Response } => {
  const normalizedExpectedToken = expectedToken?.trim();
  if (!normalizedExpectedToken) {
    return {
      ok: false,
      response: Response.json(
        {
          error: "unauthorized",
          message: "Missing or invalid automation token.",
        },
        { status: 401 },
      ),
    };
  }

  const providedToken = request.headers.get(AUTOMATION_TOKEN_HEADER);
  if (providedToken === normalizedExpectedToken) {
    return { ok: true };
  }

  return {
    ok: false,
    response: Response.json(
      {
        error: "unauthorized",
        message: "Missing or invalid automation token.",
      },
      { status: 401 },
    ),
  };
};
