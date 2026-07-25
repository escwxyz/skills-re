interface ExecuteSkillSearchInput<T> {
  query: string;
  searchMode: "keyword" | "semantic";
  serverSearch: (mode: "keyword" | "semantic") => Promise<T>;
}

export const executeSkillSearch = async <T>(input: ExecuteSkillSearchInput<T>) =>
  await input.serverSearch(input.searchMode);
