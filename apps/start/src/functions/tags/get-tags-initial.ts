import { createServerFn } from "@tanstack/react-start";
import { fetchTagsInitial } from "./tags.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getTagsInitial = createServerFn({ method: "GET" }).handler(
  async () => await fetchTagsInitial({ client: createServerORPCClient() }),
);
