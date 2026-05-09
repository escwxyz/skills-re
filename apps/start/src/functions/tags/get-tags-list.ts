import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { fetchTagsListPageData } from "./tags.server";

export const getTagsList = createServerFn({ method: "GET" })
  .inputValidator(z.object({}))
  .handler(() => fetchTagsListPageData());
