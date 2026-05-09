export interface SavedSkillPageCursor {
  id: string;
  savedAt: number;
}

export const encodeSavedSkillCursor = (cursor: SavedSkillPageCursor | null): string => {
  if (!cursor) {
    return "";
  }
  return btoa(JSON.stringify(cursor)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

export const decodeSavedSkillCursor = (cursor: string | undefined): SavedSkillPageCursor | null => {
  if (!cursor) {
    return null;
  }
  try {
    const normalized = cursor
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(cursor.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(normalized)) as { id?: unknown; savedAt?: unknown };
    if (typeof parsed.id === "string" && typeof parsed.savedAt === "number") {
      return { id: parsed.id, savedAt: parsed.savedAt };
    }
  } catch {
    return null;
  }
  return null;
};
