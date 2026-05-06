import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { locales } from "@/paraglide/runtime";
import { fetchCollectionDetailPageData } from "./collections.server";

export const getCollectionDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ locale: z.enum([...locales]), slug: z.string() }))
  .handler(({ data }) => fetchCollectionDetailPageData(data.slug, data.locale));
