import type { SnapshotStorageRuntime } from "@skills-re/api/types";
import { agentSkillsDiscoveryService } from "@skills-re/api/modules";

export interface AgentSkillsDiscoveryIndexRuntime {
  getDiscoveryIndex: typeof agentSkillsDiscoveryService.getDiscoveryIndex;
}

export interface AgentSkillMdRuntime {
  getArtifactMetadata: typeof agentSkillsDiscoveryService.getArtifactMetadata;
  snapshotStorage: SnapshotStorageRuntime;
}

const DISCOVERY_CACHE_CONTROL = "public, max-age=3600";
const DEFAULT_MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";
const SUPPORTED_ARTIFACT_METHODS = new Set(["GET", "HEAD"]);

const defaultIndexRuntime: AgentSkillsDiscoveryIndexRuntime = {
  getDiscoveryIndex: () => agentSkillsDiscoveryService.getDiscoveryIndex(),
};

const setPublicHeaders = (headers: Headers) => {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", DISCOVERY_CACHE_CONTROL);
};

export const setAgentSkillsDiscoveryHeaders = (headers: Headers) => {
  setPublicHeaders(headers);
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
};

const getArtifactContentType = (contentType: string | null | undefined) => {
  if (contentType?.startsWith("text/markdown") || contentType?.startsWith("text/plain")) {
    return contentType;
  }

  return DEFAULT_MARKDOWN_CONTENT_TYPE;
};

const toNotFoundResponse = () =>
  new Response("Skill artifact not found.", {
    status: 404,
    headers: {
      "Content-Type": "text/plain",
    },
  });

export const createAgentSkillsDiscoveryIndexResponse = async (
  runtime: AgentSkillsDiscoveryIndexRuntime = defaultIndexRuntime,
  method = "GET",
) => {
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  setAgentSkillsDiscoveryHeaders(headers);

  if (method === "HEAD") {
    return new Response(null, {
      headers,
      status: 200,
    });
  }

  return Response.json(await runtime.getDiscoveryIndex(), {
    headers,
    status: 200,
  });
};

export const createAgentSkillMdResponse = async (
  input: {
    method: "GET" | "HEAD";
    snapshotId: string;
  },
  runtime: AgentSkillMdRuntime,
) => {
  if (!SUPPORTED_ARTIFACT_METHODS.has(input.method) || !input.snapshotId.trim()) {
    return toNotFoundResponse();
  }

  const artifact = await runtime.getArtifactMetadata({
    snapshotId: input.snapshotId,
  });
  if (!artifact) {
    return toNotFoundResponse();
  }

  const object = await runtime.snapshotStorage.getSnapshotFileObject(artifact.r2Key);
  if (!object) {
    return toNotFoundResponse();
  }

  const headers = new Headers({
    "Content-Length": String(artifact.size),
    "Content-Type": getArtifactContentType(artifact.contentType),
    ETag: `"sha256-${artifact.fileHash}"`,
  });
  setAgentSkillsDiscoveryHeaders(headers);

  if (input.method === "HEAD") {
    return new Response(null, {
      headers,
      status: 200,
    });
  }

  return new Response(await object.arrayBuffer(), {
    headers,
    status: 200,
  });
};
