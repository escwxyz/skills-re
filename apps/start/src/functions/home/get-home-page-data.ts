import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { fetchHomePageData } from "./home.server";

export const getHomePageData = createServerFn({ method: "GET" })
  .inputValidator(z.object({}))
  .handler(() => fetchHomePageData());
