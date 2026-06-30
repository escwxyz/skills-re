/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  decodePagefindExportCursor,
  encodePagefindExportCursor,
  selectPagefindEntryFile,
} from "./repo";

describe("Pagefind index repository helpers", () => {
  test("round-trips deterministic export cursors", () => {
    const cursor = { id: "skill-2", updatedAt: 456 };
    const encoded = encodePagefindExportCursor(cursor);

    expect(encoded).toBe(encodePagefindExportCursor(cursor));
    expect(decodePagefindExportCursor(encoded)).toEqual(cursor);
    expect(decodePagefindExportCursor("not-json")).toBeNull();
  });

  test("selects the declared entry file before fallback skill files", () => {
    const selected = selectPagefindEntryFile(
      [
        { path: "SKILL.md", value: "fallback" },
        { path: "skills/widget/SKILL.md", value: "declared" },
      ],
      "skills/widget/SKILL.md",
      "skills/widget",
    );

    expect(selected?.value).toBe("declared");
  });

  test("resolves a relative entry path within its snapshot directory", () => {
    const selected = selectPagefindEntryFile(
      [
        { path: "SKILL.md", value: "fallback" },
        { path: "skills/widget/SKILL.md", value: "declared" },
      ],
      "SKILL.md",
      "skills/widget",
    );

    expect(selected?.value).toBe("declared");
  });
});
