import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouterClient } from "@skills-re/api/routers/index";
import { SERVER_URL } from "astro:env/server";

let didLogServerRpcTarget = false;

export const createServerClient = (request?: Request): AppRouterClient => {
  const cookie = request?.headers.get("cookie") ?? "";
  const rpcUrl = new URL("/rpc", SERVER_URL).toString();

  if (import.meta.env.PROD && !didLogServerRpcTarget) {
    didLogServerRpcTarget = true;
    console.info("[server-orpc] resolved RPC target", {
      hasCookie: cookie.length > 0,
      requestUrl: request?.url ?? null,
      rpcUrl,
      serverUrl: SERVER_URL,
    });
  }

  const link = new RPCLink({
    url: rpcUrl,
    async fetch(url, options) {
      const requestOptions = (options ?? {}) as RequestInit;
      const headers = new Headers(requestOptions.headers);
      const method = requestOptions.method ?? "GET";

      if (cookie) {
        headers.set("cookie", cookie);
      }

      const response = await fetch(url, {
        ...requestOptions,
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        const responseText = await response
          .clone()
          .text()
          .catch(() => "");
        console.error("[server-orpc] rpc request failed", {
          method,
          requestUrl: request?.url ?? null,
          responseStatus: response.status,
          responseStatusText: response.statusText,
          responseText: responseText.slice(0, 500),
          rpcUrl: String(url),
        });
      }

      return response;
    },
  });

  return createORPCClient(link) as AppRouterClient;
};
