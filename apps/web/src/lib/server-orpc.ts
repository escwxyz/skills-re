import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouterClient } from "@skills-re/api/routers/index";

const DEFAULT_SERVER_URL = "http://localhost:3000";

const resolveServerUrl = (request?: Request) => {
  const runtimeUrl = process.env.PUBLIC_SERVER_URL;
  if (typeof runtimeUrl === "string" && runtimeUrl.length > 0) {
    return runtimeUrl;
  }

  const buildTimeUrl = import.meta.env.PUBLIC_SERVER_URL;
  if (
    typeof buildTimeUrl === "string" &&
    buildTimeUrl.length > 0 &&
    buildTimeUrl !== DEFAULT_SERVER_URL
  ) {
    return buildTimeUrl;
  }

  if (request) {
    return new URL(request.url).origin;
  }

  return DEFAULT_SERVER_URL;
};

export const createServerClient = (request?: Request): AppRouterClient => {
  const cookie = request?.headers.get("cookie") ?? "";
  const link = new RPCLink({
    url: new URL("/rpc", resolveServerUrl(request)).toString(),
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
