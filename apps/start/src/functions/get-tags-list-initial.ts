import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { fetchTagsListInitial } from "./tags.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getTagsListInitial = createServerFn({ method: "GET" })
  .inputValidator(z.object({}))
  .handler(async () => await fetchTagsListInitial({ client: createServerORPCClient() }));
