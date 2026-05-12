import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchCategoryDetailPageData } from "./categories.server";

export const getCategoryDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(({ data }) =>
    fetchCategoryDetailPageData({ client: createServerORPCClient(), slug: data.slug }),
  );
