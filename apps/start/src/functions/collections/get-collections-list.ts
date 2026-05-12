import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { fetchCollectionsListPage } from "./collections.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getCollectionsList = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({
        cursor: z.string().optional(),
        limit: z.number().int().positive().max(100).optional(),
      })
      .optional(),
  )
  .handler(
    async ({ data }) =>
      await fetchCollectionsListPage({
        client: createServerORPCClient(),
        cursor: data?.cursor,
        limit: data?.limit,
      }),
  );
