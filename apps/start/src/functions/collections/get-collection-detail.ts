import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { fetchCollectionDetail } from "./collections.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getCollectionDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().trim().min(1) }))
  .handler(
    async ({ data }) =>
      await fetchCollectionDetail({
        client: createServerORPCClient(),
        slug: data.slug,
      }),
  );
