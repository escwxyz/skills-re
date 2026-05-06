import { createServerFn } from "@tanstack/react-start";

import { fetchCollectionsListPageData } from "./collections.server";

export const getCollectionsList = createServerFn({ method: "GET" }).handler(() =>
  fetchCollectionsListPageData(),
);
