import { spawnSync } from "node:child_process";

// oxlint-disable-next-line unicorn/no-unreadable-array-destructuring
const [, , command, ...args] = process.argv;

if (command !== "check" && command !== "fix") {
  console.error("Usage: bun ./scripts/ultracite-run.mjs <check|fix> [files...]");
  process.exit(1);
}

const shouldUseGithubFormat = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const ultraciteArgs = ["x", "ultracite"];
if (shouldUseGithubFormat) {
  ultraciteArgs.push(command, "--", "--format=github");
} else {
  ultraciteArgs.push(command);
}
ultraciteArgs.push(...args);

const result = spawnSync("bun", ultraciteArgs, {
  env: process.env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
