import type { AppRouterClient } from "@skills-re/api";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCClient } from "@orpc/client";
import { getRequestHeaders } from "@tanstack/react-start/server";

const rpcUrl = new URL("/rpc", "http://localhost:3000").toString();

export const createServerORPCClient = () => {
  const link = new RPCLink({
    url: rpcUrl,
    fetch(input, init) {
      const headers = getRequestHeaders();
      const cookie = headers.get("cookie");

      if (cookie) {
        headers.set("cookie", cookie);
      }

      const authorization = headers.get("authorization");

      if (authorization) {
        headers.set("authorization", authorization);
      }

      return fetch(input, {
        ...init,
        credentials: "include",
      });
    },
  });

  return createORPCClient(link) as AppRouterClient;
};
