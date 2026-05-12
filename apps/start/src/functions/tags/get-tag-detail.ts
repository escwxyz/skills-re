import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { fetchTagDetail } from "./tags.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getTagDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(
    async ({ data }) => await fetchTagDetail({ client: createServerORPCClient(), slug: data.slug }),
  );
