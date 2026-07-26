interface SearchRequestInput {
  query?: unknown;
  searchMode?: unknown;
}

const getSearchInput = (body: unknown): SearchRequestInput => {
  if (!body || typeof body !== "object") {
    return {};
  }

  const candidate = body as SearchRequestInput & { json?: unknown };
  if (Object.hasOwn(candidate, "query") || Object.hasOwn(candidate, "searchMode")) {
    return candidate;
  }

  if (candidate.json && typeof candidate.json === "object") {
    return candidate.json as SearchRequestInput;
  }

  return body as SearchRequestInput;
};

export async function shouldApplySearchRateLimit(req: Request): Promise<boolean> {
  try {
    const input = getSearchInput(await req.clone().json());
    if (input.query === undefined) {
      return false;
    }

    if (typeof input.query !== "string") {
      return true;
    }

    if (input.query.trim() === "") {
      return false;
    }

    return input.searchMode !== "keyword";
  } catch {
    // Non-JSON body (e.g. crafted FormData oRPC request) — fail closed to
    // prevent throttle bypass via alternative oRPC encodings.
    return true;
  }
}
