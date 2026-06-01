#!/usr/bin/env node
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { spawn } from "node:child_process";

import { OpenAICompatibleProvider, evaluateSkills } from "agent-skills-eval";

const EVENT_PREFIX = "__SKILLS_RE_SDK_EVENT__";
const SUMMARY_PREFIX = "__SKILLS_RE_SDK_SUMMARY__";

const parseArgs = () => {
  const configIndex = process.argv.indexOf("--config");
  if (configIndex === -1 || !process.argv[configIndex + 1]) {
    throw new Error("Missing --config <path>");
  }
  return {
    configPath: process.argv[configIndex + 1],
  };
};

const readJson = async (path) => JSON.parse(await readFile(path, "utf-8"));

const writeJson = async (path, value) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
};

const emitLine = (prefix, value) => {
  process.stdout.write(`${prefix}${JSON.stringify(value)}\n`);
};

const expandArg = (arg, context) =>
  arg
    .replaceAll("{{prompt}}", context.prompt)
    .replaceAll("{{model}}", context.model)
    .replaceAll("{{workspaceDir}}", context.workspaceDir);

const runCli = (provider, prompt, input) =>
  // oxlint-disable-next-line promise/avoid-new -- child_process.spawn uses event callbacks.
  new Promise((resolve) => {
    const startedAt = performance.now();
    const args = provider.args.map((arg) =>
      expandArg(arg, {
        model: provider.model,
        prompt,
        workspaceDir: provider.workspaceDir ?? input.root,
      }),
    );
    const child = spawn(provider.command, args, {
      cwd: provider.cwd ?? provider.workspaceDir ?? input.root,
      env: {
        ...process.env,
        ...provider.env,
      },
      timeout: provider.timeoutMs,
      killSignal: provider.killSignal ?? "SIGKILL",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      const latencyMs = Math.round(performance.now() - startedAt);
      resolve({
        provider: provider.providerName,
        model: provider.model,
        output: "",
        latencyMs,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        error: error.message,
      });
    });
    child.on("close", (exitCode) => {
      const latencyMs = Math.round(performance.now() - startedAt);
      const output = normalizeCliOutput(stdout);
      resolve({
        provider: provider.providerName,
        model: provider.model,
        output,
        latencyMs,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        ...(exitCode === 0 ? {} : { error: stderr || `command exited with ${exitCode}` }),
      });
    });
  });

const normalizeCliOutput = (stdout) => {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      return parsed;
    }
    if (parsed && typeof parsed === "object") {
      for (const key of ["output", "text", "message", "result", "content"]) {
        if (typeof parsed[key] === "string") {
          return parsed[key];
        }
      }
    }
  } catch {
    // CLI output is often plain text or newline-delimited JSON; fall through.
  }

  return trimmed;
};

const toChatPrompt = (args) => {
  const sections = [];
  if (args.system) {
    sections.push(["System", args.system].join("\n"));
  }
  if (args.attachments?.length) {
    sections.push(
      [
        "Attached files",
        ...args.attachments.map((file) => {
          const body =
            file.kind === "text"
              ? `\n${file.content}`
              : ` (${file.kind}${file.bytes ? `, ${file.bytes} bytes` : ""})`;
          return `- ${file.path}${body}`;
        }),
      ].join("\n"),
    );
  }
  sections.push(["User", args.user].join("\n"));
  return sections.join("\n\n");
};

const createCliProvider = (provider, input) => ({
  name: provider.providerName,
  model: provider.model,
  capabilities: {
    attachments: true,
    systemRole: true,
    toolCalls: false,
  },
  complete(prompt) {
    return runCli(provider, prompt, input);
  },
  completeChat(args) {
    return runCli(provider, toChatPrompt(args), input);
  },
});

const createProvider = (provider, input) => {
  if (provider.type === "openai-compatible") {
    const apiKey = process.env[provider.apiKeyEnv];
    if (!apiKey) {
      throw new Error(`Missing API key environment variable: ${provider.apiKeyEnv}`);
    }
    return new OpenAICompatibleProvider({
      apiKey,
      baseUrl: provider.baseUrl,
      extraHeaders: provider.extraHeaders,
      maxTokens: provider.maxTokens,
      model: provider.model,
      providerName: provider.providerName,
      retry: provider.retry,
      temperature: provider.temperature,
      timeoutMs: provider.timeoutMs,
    });
  }

  if (provider.type === "cli") {
    return createCliProvider(provider, input);
  }

  throw new Error(`Unsupported provider type: ${provider.type}`);
};

const main = async () => {
  const { configPath } = parseArgs();
  const input = await readJson(configPath);
  await mkdir(input.workspace, { recursive: true });
  if (input.eventsPath) {
    await mkdir(dirname(input.eventsPath), { recursive: true });
  }

  const onEvent = async (event) => {
    if (input.eventsPath) {
      await appendFile(input.eventsPath, `${JSON.stringify(event)}\n`);
    }
    emitLine(EVENT_PREFIX, event);
  };

  const result = await evaluateSkills({
    baseline: input.baseline,
    concurrency: input.concurrency,
    exclude: input.exclude,
    include: input.include,
    judge: {
      model: input.judge.model,
      provider: createProvider(input.judge, input),
    },
    judgeParams: input.judgeParams,
    onEvent: (event) => {
      void onEvent(event);
    },
    report: input.report,
    reportOutput: input.reportOutput,
    reportTitle: input.reportTitle,
    root: input.root,
    strict: input.strict,
    target: {
      model: input.target.model,
      provider: createProvider(input.target, input),
    },
    targetParams: input.targetParams,
    workspace: input.workspace,
    workspaceLayout: input.workspaceLayout,
  });

  const summary = {
    completedAt: Date.now(),
    eventsPath: input.eventsPath,
    result,
    runId: input.runId,
    status: result.failed > 0 ? "fail" : "pass",
    summary: {
      blockedCases: 0,
      failedCases: result.failed,
      passedCases: result.passed,
      totalCases: result.failed + result.passed,
    },
    summaryPath: input.summaryPath,
  };

  if (input.summaryPath) {
    await writeJson(input.summaryPath, summary);
  }
  emitLine(SUMMARY_PREFIX, summary);
};

try {
  await main();
} catch (error) {
  const failure = {
    completedAt: Date.now(),
    error: error instanceof Error ? error.message : String(error),
    status: "fail",
  };
  emitLine(SUMMARY_PREFIX, failure);
  process.exitCode = 1;
}
