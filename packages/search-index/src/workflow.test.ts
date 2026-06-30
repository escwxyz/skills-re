/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("Pagefind publication workflow", () => {
  test("is scheduled, serialized, manually dispatchable, and independent of app deployment", async () => {
    const workflowPath = resolve(import.meta.dir, "../../../.github/workflows/pagefind-index.yml");
    const workflow = await readFile(workflowPath, "utf-8").catch(() => "");

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain('cron: "0 * * * *"');
    expect(workflow).toContain("group: pagefind-index-publish");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("bun run --cwd packages/search-index generate");
    expect(workflow).toContain("bun run --cwd packages/search-index publish");
    expect(workflow).toContain("AUTOMATION_API_TOKEN: ${{ secrets.AUTOMATION_API_TOKEN }}");
    expect(workflow).toContain("CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}");
    expect(workflow).not.toContain("alchemy deploy");
    expect(workflow).not.toContain("bun run deploy");
  });
});
