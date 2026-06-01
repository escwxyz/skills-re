import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

import { DeviceApproval } from "@/components/device-approval";
import { createSeo } from "@/lib/seo";
import { getUser } from "@/functions/get-user";

const searchSchema = z.object({
  user_code: z.string().optional(),
});

export const Route = createFileRoute("/_authedLayout/device/")({
  loader: async () => await getUser(),
  validateSearch: searchSchema,
  head: () =>
    createSeo({
      canonicalPath: "/device",
      description: "Approve a CLI login using the code shown in your terminal.",
      locale: "en",
      noIndex: true,
      title: "Approve CLI login - skills.re",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const session = Route.useLoaderData();
  const search = Route.useSearch();

  return (
    <DeviceApproval
      currentUser={session?.data?.user ?? null}
      userCode={search.user_code ?? ""}
      variant="cli"
    />
  );
}
