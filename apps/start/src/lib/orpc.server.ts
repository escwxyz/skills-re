import type { AppRouterClient } from "@skills-re/api";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCClient } from "@orpc/client";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { env } from "@skills-re/env/start";

const rpcUrl = new URL("/rpc", env.VITE_SERVER_URL).toString();

export const createServerORPCClient = () => {
  const link = new RPCLink({
    url: rpcUrl,
    fetch(input, init) {
      const incomingHeaders = getRequestHeaders();
      const headers = new Headers((init as RequestInit | undefined)?.headers);
      const cookie = incomingHeaders.get("cookie");

      if (cookie) {
        headers.set("cookie", cookie);
      }

      const authorization = incomingHeaders.get("authorization");

      if (authorization) {
        headers.set("authorization", authorization);
      }

      return fetch(input, {
        ...init,
        headers,
        credentials: "include",
      });
    },
  });

  return createORPCClient(link) as AppRouterClient;
};
