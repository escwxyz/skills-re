import { CliError } from "./errors";

export interface ParsedArgs {
  flags: Map<string, string | true>;
  positionals: string[];
}

const booleanFlags = new Set(["git", "help", "json", "yes", "no-rewrite-query", "version"]);

export const parseArgs = (argv: string[]): ParsedArgs => {
  const flags = new Map<string, string | true>();
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) {
      continue;
    }
    if (arg === "--") {
      positionals.push(...argv.slice(index + 1));
      break;
    }
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const withoutPrefix = arg.slice(2);
    const [name, inlineValue] = withoutPrefix.split("=", 2);
    if (!name) {
      throw new CliError(`Invalid flag: ${arg}`);
    }

    if (booleanFlags.has(name)) {
      flags.set(name, true);
      continue;
    }

    const value = inlineValue ?? argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new CliError(`Missing value for --${name}`);
    }
    flags.set(name, value);
    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return { flags, positionals };
};

export const getFlag = (args: ParsedArgs, name: string) => {
  const value = args.flags.get(name);
  return typeof value === "string" ? value : undefined;
};

export const hasFlag = (args: ParsedArgs, name: string) => args.flags.get(name) === true;

export const parseLimit = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new CliError(`Invalid limit: ${value}`);
  }
  return parsed;
};
