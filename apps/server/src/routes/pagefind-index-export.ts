import { pagefindExportInputSchema } from "@skills-re/contract/pagefind";
import { pagefindIndexService } from "@skills-re/api/modules/pagefind-index/service";

import { verifyAutomationToken } from "../lib/automation-token";

interface PagefindIndexExportRouteDeps {
  exportPage: typeof pagefindIndexService.exportPage;
  verifyAutomationToken: typeof verifyAutomationToken;
}

export const createPagefindIndexExportResponse = async (
  request: Request,
  expectedToken?: string | null,
  overrides: Partial<PagefindIndexExportRouteDeps> = {},
) => {
  const deps: PagefindIndexExportRouteDeps = {
    exportPage: (input, serverOrigin) => pagefindIndexService.exportPage(input, serverOrigin),
    verifyAutomationToken,
    ...overrides,
  };
  const auth = deps.verifyAutomationToken(request, expectedToken);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  const parsed = pagefindExportInputSchema.safeParse({
    cursor: url.searchParams.has("cursor") ? url.searchParams.get("cursor") : undefined,
    limit: rawLimit === null ? undefined : Number(rawLimit),
  });
  if (!parsed.success) {
    return Response.json(
      {
        error: "invalid-input",
        issues: parsed.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path.join("."),
        })),
        message: "Invalid Pagefind export request.",
      },
      { status: 400 },
    );
  }

  try {
    return Response.json(await deps.exportPage(parsed.data, url.origin), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isInvalidCursor = message === "Invalid Pagefind export cursor.";
    return Response.json(
      {
        error: isInvalidCursor ? "invalid-cursor" : "internal-error",
        message: isInvalidCursor ? message : "Failed to export Pagefind records.",
      },
      { status: isInvalidCursor ? 400 : 500 },
    );
  }
};
