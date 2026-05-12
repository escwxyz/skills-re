import { createServerFn } from "@tanstack/react-start";

import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchAuthorsInitial } from "./authors.server";

export const getAuthorsInitial = createServerFn({ method: "GET" }).handler(
  async () => await fetchAuthorsInitial({ client: createServerORPCClient() }),
);
