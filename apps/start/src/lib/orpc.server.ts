import type { AppRouterClient } from "@skills-re/api";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCClient } from "@orpc/client";
import { env } from "@skills-re/env/start-worker";
import { getIncomingHeaders } from "./orpc-incoming-headers";
import { fetchServerORPCRequest } from "./orpc-transport";

const rpcUrl = new URL("/rpc", env.VITE_SERVER_URL).toString();

export const createServerORPCClient = () => {
  const link = new RPCLink({
    url: rpcUrl,
    fetch(input, init) {
      return fetchServerORPCRequest({
        incomingHeaders: getIncomingHeaders(),
        init,
        input,
        serviceBinding: env.API ?? null,
      });
    },
  });

  return createORPCClient(link) as AppRouterClient;
};
