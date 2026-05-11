import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { fetchTagDetail } from "./tags.server";

export const getTagDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(({ data }) => fetchTagDetail(data.slug));
