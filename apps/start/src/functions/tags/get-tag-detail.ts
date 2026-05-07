import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { fetchTagDetailPageData } from "./tags.server";

export const getTagDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(({ data }) => fetchTagDetailPageData(data.slug));
