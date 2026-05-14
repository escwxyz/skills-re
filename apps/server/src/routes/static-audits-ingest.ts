import { staticAuditReportSchema } from "@skills-re/contract/static-audits";
import { staticAuditsService } from "@skills-re/api/modules/static-audits/service";

import { verifyAutomationToken } from "../lib/automation-token";

interface StaticAuditIngestDeps {
  staticAuditsService: typeof staticAuditsService;
  verifyAutomationToken: typeof verifyAutomationToken;
}

const defaultDeps: StaticAuditIngestDeps = {
  staticAuditsService,
  verifyAutomationToken,
};

export const createStaticAuditIngestResponse = async (
  request: Request,
  expectedToken?: string | null,
  deps: Partial<StaticAuditIngestDeps> = {},
) => {
  const activeDeps = {
    ...defaultDeps,
    ...deps,
  };

  const auth = activeDeps.verifyAutomationToken(request, expectedToken);
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        error: "invalid-json",
        message: "Request body must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = staticAuditReportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "invalid-input",
        issues: parsed.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path.join("."),
        })),
        message: "Invalid request payload.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await activeDeps.staticAuditsService.ingest(parsed.data);
    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[route.static-audits/ingest] failed", {
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
          : { message },
    });

    return Response.json(
      {
        error: "internal-error",
        message: `Failed to ingest static audit: ${message}`,
      },
      { status: 500 },
    );
  }
};
