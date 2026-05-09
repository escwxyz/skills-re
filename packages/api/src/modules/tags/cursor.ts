const encodeTagCursor = (cursor: { count: number; slug: string } | null) => {
  if (!cursor) {
    return "";
  }

  return btoa(JSON.stringify(cursor)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const decodeTagCursor = (cursor: string | undefined) => {
  if (!cursor) {
    return null;
  }

  try {
    const normalized = cursor
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(cursor.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(normalized)) as {
      count?: unknown;
      slug?: unknown;
    };

    if (typeof parsed.count === "number" && typeof parsed.slug === "string") {
      return {
        count: parsed.count,
        slug: parsed.slug,
      };
    }
  } catch {
    return null;
  }

  return null;
};

export { decodeTagCursor, encodeTagCursor };
