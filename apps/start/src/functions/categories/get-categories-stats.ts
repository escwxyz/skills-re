import { createServerFn } from "@tanstack/react-start";

import { fetchCategoriesStats } from "./categories.server";

export const getCategoriesStats = createServerFn({ method: "GET" }).handler(() =>
  fetchCategoriesStats(),
);
