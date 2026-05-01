import type { APIRoute } from "astro";
import { SERVER_URL } from "astro:env/server";

const TIMEOUT_MS = 5000;

export const GET: APIRoute = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(new URL("/.well-known/agent-configuration", SERVER_URL), {
      signal: controller.signal,
    });

    if (!response.ok) {
      return new Response("Failed to load agent configuration.", {
        status: response.status,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const body = response.body === null ? null : await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return new Response("Upstream request timed out.", {
        status: 504,
        headers: { "Content-Type": "text/plain" },
      });
    }
    return new Response(error instanceof Error ? error.message : "Failed to reach upstream.", {
      status: 502,
      headers: { "Content-Type": "text/plain" },
    });
  } finally {
    clearTimeout(timeout);
  }
};
