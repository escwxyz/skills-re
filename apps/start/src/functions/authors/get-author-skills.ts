import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { fetchAuthorSkills } from "./authors.server";

export const getAuthorSkills = createServerFn({ method: "GET" })
  .inputValidator(z.object({ handle: z.string() }))
  .handler(({ data }) => fetchAuthorSkills(data.handle));
