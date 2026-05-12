import {
  HeadContent,
  Outlet,
  ScriptOnce,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { pacerDevtoolsPlugin } from "@tanstack/react-pacer-devtools";

import appCss from "../styles.css?url";
import type { orpc } from "@/lib/orpc";
import type { QueryClient } from "@tanstack/react-query";
import { getLocale } from "@/paraglide/runtime";
import { getUser } from "@/functions/get-user";
import { Provider } from "jotai";
import { getTheme } from "@/functions/get-theme";
import { registerTheme, ThemeProvider, themeScript } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";

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
  return (
    <Provider>
      <Outlet />
      <Toaster />
    </Provider>
  );
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
        </ThemeProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            pacerDevtoolsPlugin(),
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
