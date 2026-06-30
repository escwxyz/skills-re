import { resolve } from "node:path";
import { appendFile } from "node:fs/promises";

import { generatePagefindBundle } from "./generator";
import { publishLocalGeneration, rollbackLocalGeneration } from "./local-publication";

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
};

const command = process.argv.at(2);

const outputRoot = resolve(process.env.PAGEFIND_OUTPUT_ROOT ?? ".pagefind-output/current");

const writeWorkflowSummary = async (title: string, value: unknown) => {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }
  await appendFile(
    summaryPath,
    `## ${title}\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`,
    "utf-8",
  );
};

if (command === "generate") {
  const summary = await generatePagefindBundle({
    assetOrigin: requireEnv("PAGEFIND_ASSET_ORIGIN"),
    automationToken: requireEnv("AUTOMATION_API_TOKEN"),
    outputPath: resolve(outputRoot, "pagefind"),
    serverOrigin: requireEnv("PUBLIC_SERVER_URL"),
  });
  await writeWorkflowSummary("Pagefind generation", summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} else if (command === "publish") {
  const result = await publishLocalGeneration({
    bucket: process.env.PAGEFIND_R2_BUCKET?.trim() || "skills-re-pagefind-index",
    outputPath: resolve(outputRoot, "pagefind"),
  });
  await writeWorkflowSummary("Pagefind publication", result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else if (command === "rollback") {
  const result = await rollbackLocalGeneration({
    bucket: process.env.PAGEFIND_R2_BUCKET?.trim() || "skills-re-pagefind-index",
    generationId: requireEnv("PAGEFIND_GENERATION_ID"),
  });
  await writeWorkflowSummary("Pagefind rollback", result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  throw new Error("Usage: bun src/cli.ts <generate|publish|rollback>");
}
