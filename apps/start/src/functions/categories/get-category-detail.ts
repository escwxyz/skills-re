import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { fetchCategoryDetailPageData } from "./categories.server";

export const getCategoryDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(({ data }) => fetchCategoryDetailPageData(data.slug));
