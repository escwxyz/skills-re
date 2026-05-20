import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

import { AuthLoginPanel } from "@/components/auth-login-panel";
import { createSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

const searchSchema = z.object({
  callbackUrl: z.string().trim().optional(),
  description: z.string().trim().optional(),
  intent: z.enum(["continue", "dashboard"]).optional(),
  onlyGitHub: z.enum(["1", "true"]).optional(),
  title: z.string().trim().optional(),
});

export const Route = createFileRoute("/_publicLayout/auth")({
  validateSearch: searchSchema,
  head: () =>
    createSeo({
      canonicalPath: "/auth",
      description: m.login_dialog_sign_in_to_continue(),
      noIndex: true,
      locale: getLocale(),
      title: m.login_dialog_sign_in(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();

  return (
    <div className="relative min-h-[calc(100dvh-var(--header-height))] overflow-hidden px-4 py-10">
      <div className="bg-muted/20 pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto flex min-h-[calc(100dvh-var(--header-height)-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-md">
          <AuthLoginPanel
            callbackUrl={search.callbackUrl}
            defaultCallbackUrl="/dashboard"
            description={search.description}
            intent={search.intent}
            onlyGitHub={search.onlyGitHub === "1" || search.onlyGitHub === "true"}
            title={search.title}
          />
        </div>
      </div>
    </div>
  );
}
