import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import appCss from "../styles.css?url";
import type { orpc } from "@/lib/orpc";
import type { QueryClient } from "@tanstack/react-query";
import { getLocale } from "@/paraglide/runtime";
import { Header } from "@/components/header";
import { getUser } from "@/functions/get-user";
import { Provider } from "jotai";

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
        token: null,
      };
    }
    return {
      currentUser: data.user || null,
      isAdmin: data.user.role === "admin",
      token: data.session.token || null,
    };
  },
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
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  return (
    <Provider>
      <Header />
      <main>
        <Outlet />
      </main>
    </Provider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang={getLocale()}
      suppressHydrationWarning={!import.meta.env.DEV}
      data-scroll-behavior="smooth"
    >
      <head>
        {import.meta.env.DEV ? (
          <script src="https://unpkg.com/react-scan/dist/auto.global.js" />
        ) : null}
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
