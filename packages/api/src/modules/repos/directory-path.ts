const LEADING_SLASHES_REGEX = /^\/+/;

export const normalizeDirectoryPath = (input: string): string => {
  const replaced = input.replaceAll("\\", "/").trim();
  if (replaced.length === 0) {
    return "";
  }

  const withoutLeadingSlash = replaced.replace(LEADING_SLASHES_REGEX, "");
  if (withoutLeadingSlash.length === 0) {
    return "";
  }

  const segments = withoutLeadingSlash.split("/").filter((segment) => segment.length > 0);
  const stack: string[] = [];

  for (const segment of segments) {
    if (segment === ".") {
      continue;
    }

    if (segment === "..") {
      if (stack.length === 0) {
        throw new Error(`Invalid directory path: ${input}`);
      }
      stack.pop();
      continue;
    }

    stack.push(segment);
  }

  if (stack.length === 0) {
    return "";
  }

  return stack.join("/");
};

export const normalizeRepoDirectoryPath = (input: string): string => {
  const normalized = normalizeDirectoryPath(input);
  if (!normalized) {
    return "";
  }

  return normalized.endsWith("/") ? normalized : `${normalized}/`;
};

export const hasMatchingDirectoryPath = (
  existingDirectoryPaths: Set<string>,
  directoryPath: string,
) => existingDirectoryPaths.has(normalizeRepoDirectoryPath(directoryPath));
