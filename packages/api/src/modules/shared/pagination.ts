export const defaultLimit = 20;

export const encodeCursor = (cursor: { id: string; syncTime: number } | null) => {
  if (!cursor) {
    return "";
  }

  return btoa(JSON.stringify(cursor)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

export const decodeCursor = (cursor: string | undefined) => {
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
      syncTime?: unknown;
    };

    if (typeof parsed.id === "string" && typeof parsed.syncTime === "number") {
      return {
        id: parsed.id,
        syncTime: parsed.syncTime,
      };
    }
  } catch {
    return null;
  }

  return null;
};
