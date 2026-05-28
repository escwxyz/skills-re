const DEFAULT_TIMEOUT_MS = 5000;

export interface WellKnownForwardOptions {
  defaultContentType?: string;
  fetchFn?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  method: "GET" | "HEAD";
  path: string;
  serverUrl: string;
  timeoutMs?: number;
  upstreamErrorMessage?: string;
}

export const forwardWellKnownRequest = async ({
  defaultContentType,
  fetchFn = fetch,
  method,
  path,
  serverUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  upstreamErrorMessage,
}: WellKnownForwardOptions) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(new URL(path, serverUrl), {
      method,
      signal: controller.signal,
    });
    const headers = new Headers(response.headers);
    if (defaultContentType && !headers.has("Content-Type")) {
      headers.set("Content-Type", defaultContentType);
    }

    if (!response.ok && upstreamErrorMessage) {
      return new Response(upstreamErrorMessage, {
        headers: { "Content-Type": "text/plain" },
        status: response.status,
      });
    }

    if (method === "HEAD") {
      return new Response(null, {
        headers,
        status: response.status,
      });
    }

    const body = response.body === null ? null : await response.text();
    return new Response(body, {
      headers,
      status: response.status,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return new Response("Upstream request timed out.", {
        headers: { "Content-Type": "text/plain" },
        status: 504,
      });
    }

    return new Response(error instanceof Error ? error.message : "Failed to reach upstream.", {
      headers: { "Content-Type": "text/plain" },
      status: 502,
    });
  } finally {
    clearTimeout(timeout);
  }
};
