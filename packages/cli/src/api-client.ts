import { CliError } from "./errors";
import type { SearchSkillItem, SearchSkillsResult, SnapshotInstallResolution } from "./types";

export interface ApiClientOptions {
  apiUrl: string;
  fetchImpl?: typeof fetch;
  token?: string;
}

export interface RequestOptions {
  body?: unknown;
  method?: "DELETE" | "GET" | "POST";
  query?: Record<string, boolean | number | string | undefined>;
  token?: string;
}

const withQuery = (baseUrl: string, path: string, query?: RequestOptions["query"]) => {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
};

const normalizeSkillPath = (value: string) => value.replaceAll(/^\/+|\/+$/g, "");

export class ApiClient {
  private readonly apiUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly token?: string;

  constructor(options: ApiClientOptions) {
    this.apiUrl = options.apiUrl;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.token = options.token;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? (options.body ? "POST" : "GET");
    const response = await this.fetchImpl(withQuery(this.apiUrl, path, options.query), {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...((options.token ?? this.token)
          ? { Authorization: `Bearer ${options.token ?? this.token}` }
          : {}),
      },
      method,
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    const data =
      text.length > 0 && contentType.includes("application/json")
        ? (JSON.parse(text) as unknown)
        : text;

    if (!response.ok) {
      const message =
        typeof data === "object" && data && "message" in data
          ? String((data as { message?: unknown }).message)
          : text || `Request failed with status ${response.status}`;
      throw new CliError(message, response.status === 404 ? 4 : 1);
    }

    return data as T;
  }

  async searchSkills(input: {
    categories?: string[];
    cursor?: string;
    limit?: number;
    query?: string;
    rewriteQuery?: boolean;
    sort?: string;
    tags?: string[];
  }) {
    return await this.request<SearchSkillsResult>("/skills/search", {
      body: input,
      method: "POST",
    });
  }

  async resolveSkillPath(slug: string) {
    return await this.request<{
      authorHandle: string;
      repoName: string;
      skillSlug: string;
    } | null>("/skills/resolve-path", {
      query: { slug },
    });
  }

  async getSkillByPath(input: { authorHandle: string; repoName?: string; skillSlug: string }) {
    return await this.request<SearchSkillItem | null>("/skills/by-path", {
      query: input,
    });
  }

  async showSkill(identifier: string) {
    const normalized = normalizeSkillPath(identifier);
    const segments = normalized.split("/").filter(Boolean);
    if (segments.length >= 2) {
      const [authorHandle, maybeRepoOrSkill, maybeSkill] = segments;
      if (!authorHandle || !maybeRepoOrSkill) {
        return null;
      }
      return await this.getSkillByPath({
        authorHandle,
        repoName: maybeSkill ? maybeRepoOrSkill : undefined,
        skillSlug: maybeSkill ?? maybeRepoOrSkill,
      });
    }

    const resolved = await this.resolveSkillPath(normalized);
    if (!resolved) {
      return null;
    }
    return await this.getSkillByPath(resolved);
  }

  async resolveInstall(input: { skill: string; version?: string }) {
    return await this.request<SnapshotInstallResolution>("/cli/skills/resolve-install", {
      query: input,
    });
  }

  async downloadArchive(downloadUrl: string) {
    const response = await this.fetchImpl(new URL(downloadUrl, this.apiUrl), {
      headers: {
        Accept: "application/gzip, application/octet-stream",
      },
    });
    if (!response.ok) {
      throw new CliError(`Archive download failed with status ${response.status}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  async readOpenApiDocument() {
    return await this.request<unknown>("/openapi.json");
  }

  async startCliLogin() {
    return await this.request<{
      expiresAt?: string;
      token?: string;
      userCode?: string;
      verificationUri?: string;
      verificationUriComplete?: string;
    }>("/cli/auth/start", { method: "POST" });
  }

  async readAuthStatus(token: string) {
    return await this.request<{
      expiresAt?: string;
      user?: { email?: string; id?: string; name?: string };
    }>("/cli/auth/session", { token });
  }

  async revokeAuth(token: string) {
    return await this.request<{ revoked: boolean }>("/cli/auth/revoke", {
      method: "POST",
      token,
    });
  }

  async readAgentConfiguration() {
    return await this.request<unknown>("/.well-known/agent-configuration");
  }
}
