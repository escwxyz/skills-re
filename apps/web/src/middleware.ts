import { defineMiddleware } from "astro:middleware";
import { paraglideMiddleware } from "@/paraglide/server";

export const onRequest = defineMiddleware((context, next) =>
  paraglideMiddleware(context.request, ({ request }) => next(request)),
);
