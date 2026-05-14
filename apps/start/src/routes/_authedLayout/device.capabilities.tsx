import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

import { DeviceApproval } from "@/components/device-approval";
import { createSeo } from "@/lib/seo";
import { getUser } from "@/functions/get-user";

const searchSchema = z.object({
  user_code: z.string().optional(),
});

export const Route = createFileRoute("/_authedLayout/device/capabilities")({
  loader: async () => await getUser(),
  validateSearch: searchSchema,
  head: () =>
    createSeo({
      canonicalPath: "/device/capabilities",
      description: "Approve an agent device using a short-lived user code.",
      locale: "en",
      noIndex: true,
      title: "Device approval - skills.re",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const session = Route.useLoaderData();
  const search = Route.useSearch();

  return (
    <DeviceApproval currentUser={session?.data?.user ?? null} userCode={search.user_code ?? ""} />
  );
}
