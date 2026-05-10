export const getFileKindLabel = (path: string) => {
  const lowered = path.toLowerCase();
  if (lowered.endsWith(".md")) {
    return "Markdown";
  }
  if (lowered.endsWith(".json")) {
    return "JSON";
  }
  if (lowered.endsWith(".yaml") || lowered.endsWith(".yml")) {
    return "YAML";
  }
  if (lowered.endsWith(".ts")) {
    return "TypeScript";
  }
  if (lowered.endsWith(".tsx")) {
    return "TSX";
  }
  if (lowered.endsWith(".js")) {
    return "JavaScript";
  }
  if (lowered.endsWith(".sh")) {
    return "Shell";
  }
  if (lowered.endsWith(".diff")) {
    return "Diff";
  }

  return "Text";
};
