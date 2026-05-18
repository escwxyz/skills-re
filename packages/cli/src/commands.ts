import { setTimeout as sleep } from "node:timers/promises";
import { ApiClient } from "./api-client";
import { parseArgs, getFlag, hasFlag, parseLimit } from "./args";
import { DEFAULT_API_URL, deleteCredential, readCredential, writeCredential } from "./config";
import { CliError } from "./errors";
import { installSkill, updateSkills } from "./install";
import { readLockfile } from "./lockfile";
import { readInstalledSkillContent } from "./read";
import { resolveAgentTarget, resolveMetadataPath, resolveSkillsDir } from "./targets";
import { syncAgentMetadata } from "./sync";
import type { CommandContext, GlobalOptions, SearchSkillItem } from "./types";
import { pc, writeJson } from "./ui";

const splitCsv = (value: string | undefined) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const createApiClient = async (ctx: CommandContext) => {
  const credential = await readCredential(ctx.env);
  return new ApiClient({
    apiUrl: DEFAULT_API_URL,
    token: credential?.apiUrl === DEFAULT_API_URL ? credential.token : undefined,
  });
};

const print = (ctx: CommandContext, value: string) => {
  ctx.stdout.write(value);
};

const printSkill = (skill: SearchSkillItem) => {
  const version = skill.latestVersion ? `@${skill.latestVersion}` : "";
  const source = [skill.authorHandle, skill.repoName, skill.slug].filter(Boolean).join("/");
  return `${pc.bold(skill.title)} ${pc.dim(`${skill.slug}${version}`)}
${skill.description}
${pc.dim(source)}
`;
};

export const runSearchCommand = async (
  ctx: CommandContext,
  argv: string[],
  globalOptions: GlobalOptions,
) => {
  const args = parseArgs(argv);
  const query = args.positionals.join(" ").trim();
  const apiClient = await createApiClient(ctx);
  const result = await apiClient.searchSkills({
    categories: splitCsv(getFlag(args, "category")),
    cursor: getFlag(args, "cursor"),
    limit: parseLimit(getFlag(args, "limit"), 20),
    query: query || undefined,
    rewriteQuery: !hasFlag(args, "no-rewrite-query"),
    sort: getFlag(args, "sort"),
    tags: splitCsv(getFlag(args, "tag")),
  });

  if (globalOptions.json) {
    print(ctx, writeJson(result));
    return;
  }
  if (result.page.length === 0) {
    print(ctx, "No skills found.\n");
    return;
  }
  print(ctx, `${result.page.map(printSkill).join("\n")}\n`);
};

export const runShowCommand = async (
  ctx: CommandContext,
  argv: string[],
  globalOptions: GlobalOptions,
) => {
  const args = parseArgs(argv);
  const [identifier] = args.positionals;
  if (!identifier) {
    throw new CliError("Usage: skills-re show <slug-or-path>");
  }
  const apiClient = await createApiClient(ctx);
  const skill = await apiClient.showSkill(identifier);
  if (!skill) {
    throw new CliError(`Skill not found: ${identifier}`, 4);
  }
  print(ctx, globalOptions.json ? writeJson(skill) : `${printSkill(skill)}\n`);
};

export const runListCommand = async (
  ctx: CommandContext,
  argv: string[],
  globalOptions: GlobalOptions,
) => {
  const args = parseArgs(argv);
  const lockfile = await readLockfile(ctx.cwd, getFlag(args, "lockfile"));
  if (globalOptions.json) {
    print(ctx, writeJson(lockfile));
    return;
  }
  const entries = Object.entries(lockfile.skills);
  if (entries.length === 0) {
    print(ctx, "No locked skills.\n");
    return;
  }
  print(
    ctx,
    `${entries
      .map(
        ([name, entry]) =>
          `${pc.bold(name)} ${pc.dim(entry.sourceType)}
  source: ${entry.source}
  hash: ${entry.computedHash || "(none)"}${entry.skillPath ? `\n  path: ${entry.skillPath}` : ""}`,
      )
      .join("\n\n")}\n`,
  );
};

export const runLockCommand = runListCommand;

export const runReadCommand = async (
  ctx: CommandContext,
  argv: string[],
  globalOptions: GlobalOptions,
) => {
  const args = parseArgs(argv);
  const [name] = args.positionals;
  if (!name) {
    throw new CliError("Usage: skills-re read <name>");
  }
  const target = resolveAgentTarget(getFlag(args, "agent"));
  const skillsDir = resolveSkillsDir(ctx.cwd, target, getFlag(args, "dir"));
  const content = await readInstalledSkillContent(
    ctx.cwd,
    skillsDir,
    name,
    getFlag(args, "lockfile"),
  );
  print(ctx, globalOptions.json ? writeJson({ content }) : `${content}\n`);
};

export const runSyncCommand = async (
  ctx: CommandContext,
  argv: string[],
  globalOptions: GlobalOptions,
) => {
  const args = parseArgs(argv);
  const target = resolveAgentTarget(getFlag(args, "agent"));
  const result = await syncAgentMetadata({
    cwd: ctx.cwd,
    lockfilePath: getFlag(args, "lockfile"),
    metadataPath: resolveMetadataPath(ctx.cwd, target, getFlag(args, "output")),
    skillsDir: resolveSkillsDir(ctx.cwd, target, getFlag(args, "dir")),
    target,
  });
  print(
    ctx,
    globalOptions.json
      ? writeJson(result)
      : `Synced ${result.skillsCount} skills to ${result.metadataPath}\n`,
  );
};

export const runInstallCommand = async (
  ctx: CommandContext,
  argv: string[],
  globalOptions: GlobalOptions,
) => {
  const args = parseArgs(argv);
  const [specifier] = args.positionals;
  if (!specifier) {
    throw new CliError("Usage: skills-re install <skill[@version]>");
  }
  const target = resolveAgentTarget(getFlag(args, "agent"));
  const result = await installSkill({
    apiClient: await createApiClient(ctx),
    cwd: ctx.cwd,
    lockfilePath: getFlag(args, "lockfile"),
    skillsDir: resolveSkillsDir(ctx.cwd, target, getFlag(args, "dir")),
    specifier,
    target,
  });
  print(
    ctx,
    globalOptions.json
      ? writeJson(result)
      : `Installed ${result.skillName}@${result.version} to ${result.skillDir}\n`,
  );
};

export const runUpdateCommand = async (
  ctx: CommandContext,
  argv: string[],
  globalOptions: GlobalOptions,
) => {
  const args = parseArgs(argv);
  const target = resolveAgentTarget(getFlag(args, "agent"));
  const result = await updateSkills({
    apiClient: await createApiClient(ctx),
    cwd: ctx.cwd,
    lockfilePath: getFlag(args, "lockfile"),
    onlySkill: args.positionals[0],
    skillsDir: resolveSkillsDir(ctx.cwd, target, getFlag(args, "dir")),
    target,
  });
  print(
    ctx,
    globalOptions.json
      ? writeJson(result)
      : `Updated ${result.length} skill${result.length === 1 ? "" : "s"}.\n`,
  );
};

const runAuthLogin = async (ctx: CommandContext, apiClient: ApiClient, json: boolean) => {
  const device = await apiClient.requestDeviceCode();
  if (json) {
    print(ctx, writeJson(device));
    return;
  }
  print(ctx, `Open: ${device.verification_uri_complete}\n`);
  print(ctx, `Code: ${device.user_code}\n`);
  const intervalMs = (device.interval ?? 5) * 1000;
  const expiresAt = Date.now() + device.expires_in * 1000;
  while (Date.now() < expiresAt) {
    await sleep(intervalMs);
    const result = await apiClient.pollDeviceToken(device.device_code);
    if ("error" in result) {
      if (result.error === "authorization_pending" || result.error === "slow_down") {
        continue;
      }
      throw new CliError(`Login failed: ${result.error_description ?? result.error}`);
    }
    const status = await apiClient.readAuthStatus(result.access_token);
    await writeCredential(
      {
        apiUrl: DEFAULT_API_URL,
        expiresAt: status.expiresAt,
        token: result.access_token,
        user: status.user,
      },
      ctx.env,
    );
    print(ctx, `Logged in${status.user?.name ? ` as ${status.user.name}` : ""}.\n`);
    return;
  }
  throw new CliError("Login timed out. Please try again.");
};

export const runAuthCommand = async (
  ctx: CommandContext,
  argv: string[],
  globalOptions: GlobalOptions,
) => {
  const [subcommand] = argv;
  const apiClient = await createApiClient(ctx);

  if (subcommand === "logout") {
    const credential = await readCredential(ctx.env);
    if (credential?.apiUrl === DEFAULT_API_URL) {
      await apiClient.revokeAuth(credential.token).catch(() => null);
    }
    await deleteCredential(ctx.env);
    print(ctx, globalOptions.json ? writeJson({ loggedIn: false }) : "Logged out.\n");
    return;
  }

  if (subcommand === "status" || !subcommand) {
    const credential = await readCredential(ctx.env);
    if (!credential || credential.apiUrl !== DEFAULT_API_URL) {
      print(ctx, globalOptions.json ? writeJson({ loggedIn: false }) : "Not logged in.\n");
      return;
    }
    const status = await apiClient.readAuthStatus(credential.token);
    print(ctx, globalOptions.json ? writeJson({ loggedIn: true, ...status }) : "Logged in.\n");
    return;
  }

  if (subcommand === "login") {
    const token = getFlag(parseArgs(argv.slice(1)), "token");
    if (token) {
      throw new CliError(
        "Do not pass raw credentials on the command line. Use the server login flow.",
      );
    }
    await runAuthLogin(ctx, apiClient, globalOptions.json);
    return;
  }

  throw new CliError("Usage: skills-re auth <login|status|logout>");
};
