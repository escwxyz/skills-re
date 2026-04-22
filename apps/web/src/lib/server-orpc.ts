import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouterClient } from "@skills-re/api/routers/index";

const DEFAULT_SERVER_URL = "http://localhost:3000";

const resolveServerUrl = () => {
  const configuredUrl = import.meta.env.PUBLIC_SERVER_URL;
  if (typeof configuredUrl === "string" && configuredUrl.length > 0) {
    return configuredUrl;
  }

  return DEFAULT_SERVER_URL;
};

export const createServerClient = (request?: Request): AppRouterClient => {
  const cookie = request?.headers.get("cookie") ?? "";
  const link = new RPCLink({
    url: new URL("/rpc", resolveServerUrl()).toString(),
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
