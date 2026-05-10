import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { locales } from "@/paraglide/runtime";
import { fetchAuthorsListPageData } from "./authors.server";

export const getAuthorsList = createServerFn({ method: "GET" })
  .inputValidator(z.object({ locale: z.enum([...locales]) }))
  .handler(({ data }) => fetchAuthorsListPageData(data.locale));
