import type { SkillEvalR2Bucket } from "./event-writer";

export interface AgentSkillsEvalArtifactSandbox {
  readFile(path: string): Promise<ArrayBuffer | ReadableStream | string | Uint8Array>;
}

const trimSlashes = (value: string) => value.replaceAll(/^\/+|\/+$/g, "");

const safePathSegment = (value: string) =>
  value
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replaceAll(/[^a-zA-Z0-9._-]+/g, "-").replaceAll(/^-+|-+$/g, ""))
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");

const getContentType = (path: string) => {
  if (path.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (path.endsWith(".json") || path.endsWith(".jsonl")) {
    return "application/json; charset=utf-8";
  }
};

export const createAgentSkillsEvalSdkArtifactKey = (input: {
  artifactPrefix: string;
  artifactPath: string;
  workspaceRoot?: string;
}) => {
  const workspaceRoot = input.workspaceRoot?.replace(/\/+$/, "");
  const relativePath =
    workspaceRoot && input.artifactPath.startsWith(`${workspaceRoot}/`)
      ? input.artifactPath.slice(workspaceRoot.length + 1)
      : input.artifactPath.replace(/^\/+/, "");
  return `${trimSlashes(input.artifactPrefix)}/sdk/${safePathSegment(relativePath)}`;
};

export async function uploadAgentSkillsEvalSdkArtifacts(input: {
  artifactPaths: string[];
  artifactPrefix: string;
  bucket: Pick<SkillEvalR2Bucket, "put">;
  sandbox: AgentSkillsEvalArtifactSandbox;
  workspaceRoot?: string;
}) {
  const uploaded: { key: string; path: string }[] = [];
  for (const path of input.artifactPaths) {
    const key = createAgentSkillsEvalSdkArtifactKey({
      artifactPath: path,
      artifactPrefix: input.artifactPrefix,
      workspaceRoot: input.workspaceRoot,
    });
    const content = await input.sandbox.readFile(path);
    const body = content instanceof Uint8Array ? new Uint8Array(content).buffer : content;
    await input.bucket.put(key, body, {
      httpMetadata: {
        contentType: getContentType(path),
      },
    });
    uploaded.push({ key, path });
  }
  return uploaded;
}
