import { createServerORPCClient } from "@/lib/orpc.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

export const getTagsListInitial = createServerFn({ method: "GET" })
  .inputValidator(z.object({}))
  .handler(async () => {
    const client = createServerORPCClient();

    // we need a count api for all tags
    const page = await client.tags.listPage({ limit: 24 });

    return {
      count: page.totalCount ?? 0,
      initialPage: page,
    };
  });
