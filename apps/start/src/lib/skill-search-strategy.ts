interface ExecuteSkillSearchInput<T> {
  pagefindEnabled: boolean;
  pagefindSearch: () => Promise<T>;
  query: string;
  searchMode: "keyword" | "semantic";
  serverSearch: (mode: "keyword" | "semantic") => Promise<T>;
}

export const executeSkillSearch = async <T>(input: ExecuteSkillSearchInput<T>) => {
  const usePagefind =
    input.pagefindEnabled && input.searchMode === "keyword" && input.query.trim().length > 0;
  if (!usePagefind) {
    return await input.serverSearch(input.searchMode);
  }

  try {
    return await input.pagefindSearch();
  } catch {
    const fallback = await input.serverSearch("keyword");
    return typeof fallback === "object" && fallback !== null
      ? { ...fallback, degraded: true }
      : fallback;
  }
};
