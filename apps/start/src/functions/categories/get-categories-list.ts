import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { fetchCategoriesListPageData } from "./categories.server";

export const getCategoriesList = createServerFn({ method: "GET" })
  .inputValidator(z.object({}))
  .handler(() => fetchCategoriesListPageData());
