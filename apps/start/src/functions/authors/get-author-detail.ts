import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchAuthorDetail } from "./authors.server";

export const getAuthorDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ handle: z.string() }))
  .handler(
    async ({ data }) =>
      await fetchAuthorDetail({ client: createServerORPCClient(), handle: data.handle }),
  );
