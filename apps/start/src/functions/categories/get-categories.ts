import { createServerFn } from "@tanstack/react-start";

import { fetchCategories } from "./categories.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getCategories = createServerFn({ method: "GET" }).handler(() =>
  fetchCategories({ client: createServerORPCClient() }),
);
