import type { APIRoute } from "astro";
import { SERVER_URL } from "astro:env/server";

export const GET: APIRoute = async () => {
  const response = await fetch(new URL("/.well-known/agent-configuration", SERVER_URL));

  if (!response.ok) {
    return new Response("Failed to load agent configuration.", {
      status: response.status,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return new Response(await response.text(), {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
};
