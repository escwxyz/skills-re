import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import { createGzipEncoder, packTar } from "modern-tar";

import { ApiClient } from "./api-client";
import { MCP_TOOL_NAMES } from "./mcp";
import { run } from "./main";
import { readCredential } from "./config";
import { extractSkillArchive } from "./install";
import { parseLockfile, readLockfile, setLockedSkill, writeLockfile } from "./lockfile";
import { readInstalledSkillContent } from "./read";
import { syncAgentMetadata } from "./sync";
import { agentTargets, resolveAgentTarget } from "./targets";

const createTempDir = async () => await mkdtemp(join(tmpdir(), "skills-re-cli-"));

const createArchive = async (entries: { content: string; name: string }[]) => {
  const tar = await packTar(
    entries.map((entry) => ({
      body: new TextEncoder().encode(entry.content),
      header: {
        name: entry.name,
        size: new TextEncoder().encode(entry.content).byteLength,
        type: "file" as const,
      },
    })),
  );
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(tar);
      controller.close();
    },
  });
  const compressed = source.pipeThrough(createGzipEncoder() as never) as ReadableStream<Uint8Array>;
  return new Uint8Array(await new Response(compressed).arrayBuffer());
};

const createCommandContext = (cwd: string, env: NodeJS.ProcessEnv = {}) => {
  let stdout = "";
  let stderr = "";
  return {
    context: {
      cwd,
      env,
      stderr: {
        write: (value: string) => {
          stderr += value;
          return true;
        },
      } as NodeJS.WritableStream,
      stdin: { isTTY: false } as NodeJS.ReadStream,
      stdout: {
        write: (value: string) => {
          stdout += value;
          return true;
        },
      } as NodeJS.WritableStream,
    },
    read: () => ({ stderr, stdout }),
  };
};

const mockFetch = (handler: (url: URL, init?: RequestInit) => Response | Promise<Response>) => {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? new URL(input.url) : new URL(input);
    return Promise.resolve(handler(url, init));
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
};

describe("ApiClient", () => {
  test("normalizes successful and failed API responses", async () => {
    const restore = mockFetch((url) => {
      if (url.pathname === "/ok") {
        return Response.json({ ok: true });
      }
      return Response.json({ message: "Nope" }, { status: 404 });
    });
    const client = new ApiClient({ apiUrl: "https://api.example.com" });

    expect(await client.request<{ ok: boolean }>("/ok")).toEqual({ ok: true });
    await expect(client.request("/missing")).rejects.toThrow("Nope");
    restore();
  });
});

describe("MCP bridge", () => {
  test("defines the MVP tool surface", () => {
    expect(MCP_TOOL_NAMES).toEqual([
      "read_installed_skill",
      "sync_skills_metadata",
      "install_skill",
    ]);
  });

  test("prints remote MCP setup without starting stdio transport", async () => {
    const cwd = await createTempDir();
    const io = createCommandContext(cwd);

    await run(["mcp", "--remote-config"], io.context);

    const output = JSON.parse(io.read().stdout) as {
      local: { tools: string[] };
      remote: { tools: string[]; url: string };
    };
    expect(output.local.tools).not.toContain("search_skills");
    expect(output.local.tools).not.toContain("show_skill");
    expect(output.remote.url).toBe("https://api.skills.re/mcp");
    expect(output.remote.tools).toContain("search_skills");
    expect(output.remote.tools).toContain("get_skill");
  });
});

describe("commands", () => {
  test("search prints JSON output", async () => {
    const restore = mockFetch(() =>
      Response.json({
        continueCursor: "",
        isDone: true,
        page: [{ description: "Demo", id: "1", slug: "demo", title: "Demo" }],
      }),
    );
    const cwd = await createTempDir();
    const io = createCommandContext(cwd);

    await run(["search", "demo", "--json"], io.context);

    expect(JSON.parse(io.read().stdout)).toMatchObject({ page: [{ slug: "demo" }] });
    restore();
  });

  test("show reports missing skills", async () => {
    const restore = mockFetch(() => Response.json(null));
    const cwd = await createTempDir();
    const io = createCommandContext(cwd);

    await expect(run(["show", "missing"], io.context)).rejects.toThrow("Skill not found");
    restore();
  });

  test("auth login polls through authorization_pending before storing credential", async () => {
    const cwd = await createTempDir();
    const configDir = join(cwd, "config");
    let pollCount = 0;
    const restore = mockFetch((url) => {
      if (url.pathname === "/auth/device/code") {
        return Response.json({
          device_code: "dc",
          expires_in: 30,
          interval: 0,
          user_code: "ABCD-EFGH",
          verification_uri_complete: "https://skills.re/device?user_code=ABCD-EFGH",
        });
      }
      if (url.pathname === "/auth/device/token") {
        pollCount += 1;
        if (pollCount < 3) {
          return Response.json(
            { error: "authorization_pending", error_description: "Waiting for user" },
            { status: 400 },
          );
        }
        return Response.json({
          access_token: "token-1",
          expires_in: 2592000,
          scope: "",
          token_type: "bearer",
        });
      }
      return Response.json({
        expiresAt: "2030-01-01T00:00:00.000Z",
        user: { id: "user-1" },
      });
    });
    const io = createCommandContext(cwd, { SKILLS_RE_CONFIG_DIR: configDir });

    await run(["auth", "login"], io.context);

    expect(pollCount).toBe(3);
    await expect(readCredential(io.context.env)).resolves.toMatchObject({ token: "token-1" });
    restore();
  });

  test("auth login stores server-issued CLI credential", async () => {
    const cwd = await createTempDir();
    const configDir = join(cwd, "config");
    const restore = mockFetch((url) => {
      if (url.pathname === "/auth/device/code") {
        return Response.json({
          device_code: "dc",
          expires_in: 30,
          interval: 0,
          user_code: "ABCD-EFGH",
          verification_uri_complete: "https://skills.re/device?user_code=ABCD-EFGH",
        });
      }
      if (url.pathname === "/auth/device/token") {
        return Response.json({
          access_token: "token-1",
          expires_in: 2592000,
          scope: "",
          token_type: "bearer",
        });
      }
      return Response.json({
        expiresAt: "2030-01-01T00:00:00.000Z",
        user: { id: "user-1" },
      });
    });
    const io = createCommandContext(cwd, { SKILLS_RE_CONFIG_DIR: configDir });

    await run(["auth", "login"], io.context);

    await expect(readCredential(io.context.env)).resolves.toMatchObject({ token: "token-1" });
    restore();
  });
});

describe("skills-lock.json", () => {
  test("parses and preserves compatible lock entries", async () => {
    const parsed = parseLockfile(`{
      "version": 1,
      "skills": {
        "hono": {
          "source": "yusukebe/hono-skill",
          "sourceType": "github",
          "computedHash": "abc"
        }
      }
    }`);

    expect(parsed.skills.hono?.source).toBe("yusukebe/hono-skill");
    // old computedHash field migrates to archiveHash
    expect(parsed.skills.hono?.archiveHash).toBe("abc");

    const cwd = await createTempDir();
    await writeLockfile(
      cwd,
      setLockedSkill(parsed, "codex", {
        archiveHash: "def",
        source: "openai/codex",
        sourceType: "github",
      }),
    );
    const roundTrip = await readLockfile(cwd);
    expect(Object.keys(roundTrip.skills)).toEqual(["codex", "hono"]);
  });

  test("round trips the repository root lockfile fixture", async () => {
    const fixture = await readFile(new URL("../../../skills-lock.json", import.meta.url), "utf8");
    const parsed = parseLockfile(fixture);
    const cwd = await createTempDir();
    await writeLockfile(cwd, parsed);

    expect(await readLockfile(cwd)).toEqual(parsed);
  });

  test("returns an empty lockfile when missing and rejects malformed files", async () => {
    const cwd = await createTempDir();
    await expect(readLockfile(cwd)).resolves.toEqual({ skills: {}, version: 1 });
    await writeFile(join(cwd, "skills-lock.json"), "{}");
    await expect(readLockfile(cwd)).rejects.toThrow("Invalid skills-lock.json");
  });
});

describe("read and sync", () => {
  test("rejects unknown agent targets", () => {
    expect(() => resolveAgentTarget("unknown")).toThrow("Unsupported agent target");
  });

  test("reads installed skill content with base directory", async () => {
    const cwd = await createTempDir();
    const skillsDir = join(cwd, ".agent", "skills");
    await mkdir(join(skillsDir, "demo"), { recursive: true });
    await writeFile(
      join(skillsDir, "demo", "SKILL.md"),
      "---\nname: demo\ndescription: Demo skill\n---\n# Demo\n",
    );
    await writeLockfile(cwd, {
      version: 1,
      skills: {
        demo: {
          archiveHash: "hash",
          source: "acme/demo",
          sourceType: "github",
        },
      },
    });

    const content = await readInstalledSkillContent(cwd, skillsDir, "demo");
    expect(content).toContain("<skill_base_dir>");
    expect(content).toContain("# Demo");
  });

  test("sync replaces only the managed metadata block", async () => {
    const cwd = await createTempDir();
    const skillsDir = join(cwd, ".agent", "skills");
    const metadataPath = join(cwd, "AGENTS.md");
    await mkdir(join(skillsDir, "demo"), { recursive: true });
    await writeFile(
      join(skillsDir, "demo", "SKILL.md"),
      "---\nname: demo\ndescription: Demo skill\n---\n# Demo\n",
    );
    await writeFile(metadataPath, "Header\n\nFooter\n");
    await writeLockfile(cwd, {
      version: 1,
      skills: {
        demo: {
          archiveHash: "hash",
          source: "acme/demo",
          sourceType: "github",
        },
      },
    });

    await syncAgentMetadata({
      cwd,
      metadataPath,
      skillsDir,
      target: agentTargets.universal,
    });
    const content = await readFile(metadataPath, "utf8");
    expect(content).toContain("Header");
    expect(content).toContain("Footer");
    expect(content).toContain("<name>demo</name>");
  });
});

describe("archive extraction", () => {
  test("extracts safe skill archives", async () => {
    const cwd = await createTempDir();
    const archive = await createArchive([{ content: "hello", name: "SKILL.md" }]);
    const result = await extractSkillArchive({
      archiveBytes: archive,
      skillDir: join(cwd, "skill"),
    });

    expect(result.filesCount).toBe(1);
    expect(await readFile(join(cwd, "skill", "SKILL.md"), "utf8")).toBe("hello");
  });

  test("installs through the command path with target-specific directories", async () => {
    const archive = await createArchive([{ content: "hello", name: "SKILL.md" }]);
    const restore = mockFetch((url) => {
      if (url.pathname === "/cli/skills/resolve-install") {
        return Response.json({
          archive: {
            available: true,
            downloadUrl: "https://api.example.com/skills/download?snapshotId=snap_1",
          },
          lockEntry: {
            archiveHash: "hash",
            source: "acme/skills",
            sourceType: "github",
            skillPath: "SKILL.md",
          },
          skill: {
            description: "Demo",
            id: "skill_1",
            repoName: "skills",
            slug: "demo",
            title: "Demo",
          },
          snapshot: {
            directoryPath: "",
            entryPath: "SKILL.md",
            hash: "hash",
            id: "snap_1",
            version: "1.0.0",
          },
        });
      }
      return new Response(archive);
    });
    const cwd = await createTempDir();
    const io = createCommandContext(cwd);

    await run(["install", "demo", "--agent", "universal"], io.context);

    expect(await readFile(join(cwd, ".agent", "skills", "demo", "SKILL.md"), "utf8")).toBe("hello");
    expect((await readLockfile(cwd)).skills.demo?.version).toBe("1.0.0");
    restore();
  });

  test("update skips already current locked skills", async () => {
    const cwd = await createTempDir();
    await writeLockfile(cwd, {
      version: 1,
      skills: {
        demo: {
          archiveHash: "hash",
          source: "acme/skills",
          sourceType: "github",
          version: "1.0.0",
        },
      },
    });
    let downloadCount = 0;
    const restore = mockFetch((url) => {
      if (url.pathname === "/cli/skills/resolve-install") {
        return Response.json({
          archive: { available: true, downloadUrl: "https://api.example.com/archive.tgz" },
          lockEntry: {
            archiveHash: "hash",
            source: "acme/skills",
            sourceType: "github",
          },
          skill: { description: "Demo", id: "skill_1", slug: "demo", title: "Demo" },
          snapshot: {
            directoryPath: "",
            entryPath: "SKILL.md",
            hash: "hash",
            id: "snap_1",
            version: "1.0.0",
          },
        });
      }
      downloadCount += 1;
      return new Response();
    });
    const io = createCommandContext(cwd);

    await run(["update"], io.context);

    expect(downloadCount).toBe(0);
    expect(io.read().stdout).toContain("Updated 0 skills");
    restore();
  });

  test("failed command install does not update the lockfile", async () => {
    const archive = await createArchive([{ content: "bad", name: "../SKILL.md" }]);
    const cwd = await createTempDir();
    const restore = mockFetch((url) => {
      if (url.pathname === "/cli/skills/resolve-install") {
        return Response.json({
          archive: {
            available: true,
            downloadUrl: "https://api.example.com/skills/download?snapshotId=snap_1",
          },
          lockEntry: {
            archiveHash: "hash",
            source: "acme/skills",
            sourceType: "github",
          },
          skill: { description: "Demo", id: "skill_1", slug: "demo", title: "Demo" },
          snapshot: {
            directoryPath: "",
            entryPath: "SKILL.md",
            hash: "hash",
            id: "snap_1",
            version: "1.0.0",
          },
        });
      }
      return new Response(archive);
    });
    const io = createCommandContext(cwd);

    await expect(run(["install", "demo"], io.context)).rejects.toThrow("Unsafe archive path");
    await expect(readLockfile(cwd)).resolves.toEqual({ skills: {}, version: 1 });
    restore();
  });

  test("rejects unsafe archive paths before replacing existing install", async () => {
    const cwd = await createTempDir();
    await mkdir(join(cwd, "skill"), { recursive: true });
    await writeFile(join(cwd, "skill", "SKILL.md"), "existing");
    const archive = await createArchive([{ content: "bad", name: "../SKILL.md" }]);

    await expect(
      extractSkillArchive({
        archiveBytes: archive,
        skillDir: join(cwd, "skill"),
      }),
    ).rejects.toThrow("Unsafe archive path");
    expect(await readFile(join(cwd, "skill", "SKILL.md"), "utf8")).toBe("existing");
  });
});
