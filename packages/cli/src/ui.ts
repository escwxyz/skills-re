import { cancel, confirm, isCancel, spinner } from "@clack/prompts";
import pc from "picocolors";

import { CliError } from "./errors";

export { pc };

export interface UiOptions {
  json?: boolean;
  yes?: boolean;
}

export const writeJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export const formatError = (message: string) => `${pc.red("error")} ${message}\n`;

export const createSpinner = (message: string, options: UiOptions = {}) => {
  if (options.json) {
    return {
      start: () => {},
      stop: () => {},
      message: () => {},
    };
  }
  const active = spinner();
  active.start(message);
  return active;
};

export const confirmOrThrow = async (message: string, options: UiOptions = {}) => {
  if (options.yes) {
    return true;
  }
  if (options.json || !process.stdin.isTTY) {
    throw new CliError("Confirmation required. Re-run with --yes in non-interactive mode.");
  }
  const result = await confirm({ message });
  if (isCancel(result)) {
    cancel("Cancelled");
    throw new CliError("Cancelled", 130);
  }
  if (!result) {
    throw new CliError("Cancelled", 130);
  }
  return result;
};
