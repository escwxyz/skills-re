import { createServerFn } from "@tanstack/react-start";

import { fetchCategoriesStats } from "./categories.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getCategoriesStats = createServerFn({ method: "GET" }).handler(() =>
  fetchCategoriesStats({ client: createServerORPCClient() }),
);
