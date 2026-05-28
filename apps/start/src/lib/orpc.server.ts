import type { AppRouterClient } from "@skills-re/api";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCClient } from "@orpc/client";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { env } from "@skills-re/env/server";
import { fetchServerORPCRequest } from "./orpc-transport";

const rpcUrl = new URL("/rpc", env.VITE_SERVER_URL).toString();

const getIncomingHeaders = () => {
  try {
    return getRequestHeaders();
  } catch {
    return new Headers();
  }
};

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
