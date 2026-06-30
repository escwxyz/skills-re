import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

import type { SearchIndexObjectStore } from "./publisher";

const WRANGLER_TIMEOUT_MS = 30_000;

export const runWrangler = async (
  args: string[],
  stdout: "ignore" | "pipe" = "ignore",
  options: { spawnImpl?: typeof spawn; timeoutMs?: number } = {},
) => {
  const timeoutMs = options.timeoutMs ?? WRANGLER_TIMEOUT_MS;
  const child = (options.spawnImpl ?? spawn)("bunx", ["wrangler", ...args], {
    stdio: ["ignore", stdout, "pipe"],
  });
  // oxlint-disable-next-line promise/avoid-new
  const completion = new Promise<Uint8Array | null>((resolve, reject) => {
    const stderrChunks: Buffer[] = [];
    const stdoutChunks: Buffer[] = [];
    child.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
    child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode !== 0) {
        reject(
          new Error(
            `Wrangler failed (${exitCode ?? "unknown"}): ${Buffer.concat(stderrChunks).toString("utf-8").trim()}`,
          ),
        );
        return;
      }
      resolve(stdout === "pipe" ? new Uint8Array(Buffer.concat(stdoutChunks)) : null);
    });
  });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  // oxlint-disable-next-line promise/avoid-new
  const timedOut = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Wrangler timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([completion, timedOut]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

export const isMissingR2ObjectError = (error: unknown) =>
  error instanceof Error && error.message.includes("The specified key does not exist.");

export class WranglerR2Store implements SearchIndexObjectStore {
  readonly bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  async head(key: string) {
    return (await this.get(key)) !== null;
  }

  async get(key: string) {
    let bytes: Uint8Array | null;
    try {
      bytes = await runWrangler(
        ["r2", "object", "get", `${this.bucket}/${key}`, "--pipe", "--remote"],
        "pipe",
      );
    } catch (error) {
      if (isMissingR2ObjectError(error)) {
        return null;
      }
      throw error;
    }
    if (!bytes) {
      throw new Error(`R2 object was empty: ${key}`);
    }
    return bytes;
  }

  async put(
    key: string,
    bytes: Uint8Array,
    metadata: { cacheControl: string; contentType: string },
  ) {
    const directory = await mkdtemp(join(tmpdir(), "skills-re-r2-put-"));
    const filePath = join(directory, "object");
    try {
      await writeFile(filePath, bytes);
      await runWrangler([
        "r2",
        "object",
        "put",
        `${this.bucket}/${key}`,
        "--file",
        filePath,
        "--content-type",
        metadata.contentType,
        "--cache-control",
        metadata.cacheControl,
        "--remote",
      ]);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  }

  async delete(key: string) {
    await runWrangler(["r2", "object", "delete", `${this.bucket}/${key}`, "--remote"]);
  }
}
