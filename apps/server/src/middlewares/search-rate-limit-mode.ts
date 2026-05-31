interface SearchRequestInput {
  query?: unknown;
  searchMode?: unknown;
}

const getSearchInput = (body: unknown): SearchRequestInput => {
  if (!body || typeof body !== "object") {
    return {};
  }

  const candidate = body as { json?: unknown };
  if (candidate.json && typeof candidate.json === "object") {
    return candidate.json as SearchRequestInput;
  }

  return body as SearchRequestInput;
};

export async function shouldApplySearchRateLimit(req: Request): Promise<boolean> {
  try {
    const input = getSearchInput(await req.clone().json());
    if (!input.query) {
      return false;
    }

    return input.searchMode !== "keyword";
  } catch {
    // Non-JSON body (e.g. crafted FormData oRPC request) — fail closed to
    // prevent throttle bypass via alternative oRPC encodings.
    return true;
  }
}
