import { defineMiddleware, sequence } from "astro:middleware";
import { paraglideMiddleware } from "@/paraglide/server";
import { authClient } from "@/lib/auth-client";

const authMiddleware = defineMiddleware(async (context, next) => {
  const cookie = context.request.headers.get("cookie") ?? "";
  try {
    const { data } = await authClient.getSession({
      fetchOptions: { headers: { cookie } },
    });
    context.locals.user = data?.user ?? null;
    context.locals.session = data?.session ?? null;
  } catch {
    context.locals.user = null;
    context.locals.session = null;
  }
  return next();
});

const i18nMiddleware = defineMiddleware((context, next) => {
  // Avoid consuming bodies for non-GET/HEAD requests
  // https://github.com/opral/paraglide-js/issues/564
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    return next(context.request);
  }
  return paraglideMiddleware(context.request, ({ request }) => next(request));
});

export const onRequest = sequence(authMiddleware, i18nMiddleware);
