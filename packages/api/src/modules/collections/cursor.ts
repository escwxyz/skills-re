const encodeCollectionCursor = (cursor: { id: string; title: string } | null) => {
  if (!cursor) {
    return "";
  }

  return btoa(JSON.stringify(cursor)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const decodeCollectionCursor = (cursor: string | undefined) => {
  if (!cursor) {
    return null;
  }

  try {
    const normalized = cursor
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(cursor.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(normalized)) as {
      id?: unknown;
      title?: unknown;
    };

    if (typeof parsed.id === "string" && typeof parsed.title === "string") {
      return {
        id: parsed.id,
        title: parsed.title,
      };
    }
  } catch {
    return null;
  }

  return null;
};

export { decodeCollectionCursor, encodeCollectionCursor };
