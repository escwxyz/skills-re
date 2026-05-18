import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const readPackageVersion = async () => {
  const packageUrl = new URL("../package.json", import.meta.url);
  const content = await readFile(fileURLToPath(packageUrl.href), "utf-8");
  const parsed = JSON.parse(content) as { version?: unknown };
  return typeof parsed.version === "string" ? parsed.version : "0.0.0";
};
