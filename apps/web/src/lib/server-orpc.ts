import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouterClient } from "@skills-re/api/routers/index";
import { PUBLIC_SERVER_URL } from "astro:env/client";

export const createServerClient = (request?: Request): AppRouterClient => {
  const cookie = request?.headers.get("cookie") ?? "";
  const link = new RPCLink({
    url: new URL("/rpc", PUBLIC_SERVER_URL).toString(),
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
