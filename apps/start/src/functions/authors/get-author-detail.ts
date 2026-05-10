import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";

export const getAuthorDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ handle: z.string() }))
  .handler(async ({ data }) => {
    const client = createServerORPCClient();
    return await client.skills.getAuthorByHandle({ handle: data.handle });
  });
