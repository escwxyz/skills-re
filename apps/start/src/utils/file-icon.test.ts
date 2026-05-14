import { describe, expect, test } from "bun:test";
import {
  FileCodeIcon,
  FileMdIcon,
  FileTextIcon,
  FileSvgIcon,
  FileTsIcon,
  FileZipIcon,
} from "@phosphor-icons/react";

import { getFileIconForPath } from "./file-icon";

describe("getFileIconForPath", () => {
  test("uses file-specific icons for common extensions", () => {
    expect(getFileIconForPath("docs/readme.md")).toBe(FileMdIcon);
    expect(getFileIconForPath("src/app.ts")).toBe(FileTsIcon);
    expect(getFileIconForPath("assets/logo.svg")).toBe(FileSvgIcon);
    expect(getFileIconForPath("archives/skill.zip")).toBe(FileZipIcon);
  });

  test("falls back to a text icon for unknown extensions", () => {
    expect(getFileIconForPath("notes/skill.unknown")).toBe(FileTextIcon);
    expect(getFileIconForPath("notes/README")).toBe(FileTextIcon);
  });

  test("uses a code icon for structured config files", () => {
    expect(getFileIconForPath("config/settings.yaml")).toBe(FileCodeIcon);
    expect(getFileIconForPath("config/settings.json")).toBe(FileCodeIcon);
  });
});
