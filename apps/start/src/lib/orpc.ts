import type { AppRouterClient } from "@skills-re/api";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCClient } from "@orpc/client";
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

export const orpc = createTanstackQueryUtils(createClientORPCClient());
