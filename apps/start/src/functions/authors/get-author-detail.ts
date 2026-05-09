import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { fetchAuthorDetailPageData } from "./authors.server";

export const getAuthorDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ handle: z.string() }))
  .handler(({ data }) => fetchAuthorDetailPageData(data.handle));
