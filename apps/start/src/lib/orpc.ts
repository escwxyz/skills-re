import { createIsomorphicFn } from "@tanstack/react-start";
import type { AppRouterClient } from "@skills-re/api";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCClient } from "@orpc/client";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.log(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: query.invalidate,
        },
      });
    },
  }),
});

// const rpcUrl = new URL("/rpc", env.PUBLIC_SERVER_URL).toString();

const rpcUrl = new URL("/rpc", "http://localhost:3000").toString();

const createServerORPCClient = () => {
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

const createClientORPCClient = () => {
  const link = new RPCLink({
    url: rpcUrl,
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    },
  });

  return createORPCClient(link) as AppRouterClient;
};

const getORPCClient = createIsomorphicFn()
  // orpc on the tanstack server
  .server(() => createServerORPCClient())
  // orpc on the tanstack client
  .client(() => createClientORPCClient());

export const orpc = createTanstackQueryUtils(getORPCClient());
