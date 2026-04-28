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
    fetch(url, options) {
      const requestOptions = (options ?? {}) as RequestInit;
      const headers = new Headers(requestOptions.headers);

      if (cookie) {
        headers.set("cookie", cookie);
      }

      return fetch(url, {
        ...requestOptions,
        credentials: "include",
        headers,
      });
    },
  });

  return createORPCClient(link) as AppRouterClient;
};
