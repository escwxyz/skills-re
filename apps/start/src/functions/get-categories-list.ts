import { createServerFn } from "@tanstack/react-start";

import { fetchCategoriesList } from "./categories.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getCategoriesList = createServerFn({ method: "GET" }).handler(() =>
  fetchCategoriesList({ client: createServerORPCClient() }),
);
