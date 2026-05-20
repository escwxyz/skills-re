import {
  HeadContent,
  Outlet,
  ScriptOnce,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { orpc } from "@/lib/orpc";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { getLocale } from "@/paraglide/runtime";
import { getUser } from "@/functions/get-user";
import { useEffect, useRef } from "react";
import { Provider, useAtomValue, useSetAtom } from "jotai";
import { getTheme } from "@/functions/get-theme";
import { registerTheme, ThemeProvider, themeScript } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { ClarityConsent } from "@/components/clarity-consent";
import { GoogleAnalyticsConsent } from "@/components/google-analytics-consent";
import { env } from "@skills-re/env/start";
import { GoogleAnalytics, useGoogleAnalytics } from "tanstack-router-ga4";
import { pendingActionAtom, writeReviewDialogAtom } from "@/atoms/app";
import { executePendingAction } from "@/utils/pending-action";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  beforeLoad: async () => {
    const { data, error } = await getUser();

    if (error || !data) {
      return {
        currentUser: null,
        isAdmin: false,
      };
    }
    return {
      currentUser: data.user || null,
      isAdmin: data.user.role === "admin",
    };
  },

  loader: async () => ({
    themeState: await getTheme(),
  }),

  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  const { currentUser, isAdmin } = useRouteContext({ from: "__root__" });
  const ga = useGoogleAnalytics();

  useEffect(() => {
    if (!currentUser || isAdmin) {
      return;
    }
    ga.set({
      user_id: currentUser.id,
      user_properties: {
        email: currentUser.email,
      },
    });
  }, [currentUser, ga, isAdmin]);

  return (
    <Provider>
      <PendingActionBootstrap />
      <Outlet />
      <Toaster />
    </Provider>
  );
}

function PendingActionBootstrap() {
  const { currentUser, queryClient } = useRouteContext({ from: "__root__" });
  const pendingAction = useAtomValue(pendingActionAtom);
  const setPendingAction = useSetAtom(pendingActionAtom);
  const setWriteReviewDialog = useSetAtom(writeReviewDialogAtom);
  const runningRef = useRef(false);
  const saveSkillMutation = useMutation(orpc.skills.save.mutationOptions({}));
  const claimAsAuthorMutation = useMutation(orpc.skills.claimAsAuthor.mutationOptions({}));

  useEffect(() => {
    if (!currentUser || !pendingAction || runningRef.current) {
      return;
    }

    runningRef.current = true;

    void (async () => {
      try {
        await executePendingAction(pendingAction, {
          claimAuthor: async (slug) => await claimAsAuthorMutation.mutateAsync({ slug }),
          openWriteReview: ({ initialStars, skillId }) =>
            Promise.resolve(
              setWriteReviewDialog({
                initialStars: initialStars ?? 0,
                open: true,
                skillId,
              }),
            ),
          saveSkill: async (slug) => await saveSkillMutation.mutateAsync({ slug }),
        });

        if (pendingAction.type === "save-skill") {
          const savedQueryKey = ["skillCheckSaved", pendingAction.slug] as const;
          queryClient.setQueryData(savedQueryKey, { saved: true });
          await queryClient.invalidateQueries({ queryKey: savedQueryKey });
        }

        setPendingAction(null);
      } catch (error) {
        console.error("Failed to execute pending action", error);
      } finally {
        runningRef.current = false;
      }
    })();
  }, [
    claimAsAuthorMutation,
    currentUser,
    pendingAction,
    saveSkillMutation,
    setPendingAction,
    setWriteReviewDialog,
    queryClient,
  ]);

  return null;
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { themeState } = Route.useLoaderData();
  return (
    <html
      lang={getLocale()}
      suppressHydrationWarning={!import.meta.env.DEV}
      className="scroll-smooth"
      {...registerTheme(themeState)}
    >
      <head>
        {import.meta.env.DEV ? (
          <script src="https://unpkg.com/react-scan/dist/auto.global.js" />
        ) : null}
        <ScriptOnce>{themeScript()}</ScriptOnce>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider initial={themeState} disableTransition={false}>
          {children}
          <ClarityConsent projectId={env.VITE_CLARITY_PROJECT_ID} />
          <GoogleAnalyticsConsent />
          <GoogleAnalytics measurementId={env.VITE_GA_MEASURE_ID} />
        </ThemeProvider>

        <Scripts />
      </body>
    </html>
  );
}
