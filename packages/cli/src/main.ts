#!/usr/bin/env node
import {
  runAuthCommand,
  runInstallCommand,
  runListCommand,
  runLockCommand,
  runReadCommand,
  runSearchCommand,
  runShowCommand,
  runSyncCommand,
  runUpdateCommand,
} from "./commands";
import { CliError, toErrorMessage } from "./errors";
import { helpText } from "./help";
import { startMcpServer } from "./mcp";
import type { CommandContext, GlobalOptions } from "./types";
import { formatError } from "./ui";
import { readPackageVersion } from "./version";

const createContext = (): CommandContext => ({
  cwd: process.cwd(),
  env: process.env,
  stderr: process.stderr,
  stdin: process.stdin,
  stdout: process.stdout,
});

const extractGlobalOptions = (argv: string[]) => {
  const commandArgv: string[] = [];
  const options: GlobalOptions = {
    json: false,
    yes: false,
  };
  let help = false;
  let version = false;

  for (const arg of argv) {
    if (arg === "--help") {
      help = true;
      continue;
    }
    if (arg === "--version") {
      version = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--yes") {
      options.yes = true;
      continue;
    }
    if (arg) {
      commandArgv.push(arg);
    }
  }

  return { commandArgv, help, options, version };
};

const run = async (argv: string[], ctx = createContext()) => {
  const parsed = extractGlobalOptions(argv);
  if (parsed.help) {
    ctx.stdout.write(helpText);
    return;
  }
  if (parsed.version) {
    ctx.stdout.write(`${await readPackageVersion()}\n`);
    return;
  }

  const [command, ...rest] = parsed.commandArgv;
  const globalOptions = parsed.options;

  switch (command) {
    case "auth": {
      await runAuthCommand(ctx, rest, globalOptions);
      return;
    }
    case "install": {
      await runInstallCommand(ctx, rest, globalOptions);
      return;
    }
    case "list": {
      await runListCommand(ctx, rest, globalOptions);
      return;
    }
    case "lock": {
      await runLockCommand(ctx, rest, globalOptions);
      return;
    }
    case "mcp": {
      await startMcpServer(ctx, rest);
      return;
    }
    case "read": {
      await runReadCommand(ctx, rest, globalOptions);
      return;
    }
    case "search": {
      await runSearchCommand(ctx, rest, globalOptions);
      return;
    }
    case "show": {
      await runShowCommand(ctx, rest, globalOptions);
      return;
    }
    case "sync": {
      await runSyncCommand(ctx, rest, globalOptions);
      return;
    }
    case "update": {
      await runUpdateCommand(ctx, rest, globalOptions);
      return;
    }
    default: {
      throw new CliError(command ? `Unknown command: ${command}` : helpText, command ? 1 : 0);
    }
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await run(process.argv.slice(2));
  } catch (error: unknown) {
    const exitCode = error instanceof CliError ? error.exitCode : 1;
    if (exitCode !== 0) {
      process.stderr.write(formatError(toErrorMessage(error)));
    }
    process.exit(exitCode);
  }
}

export { run };
