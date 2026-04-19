import { ORPCError, implement } from "@orpc/server";
import { contract } from "@skills-re/contract";

import type { Context } from "../types";

export const o = implement(contract).$context<Context>();

export const publicProcedure = o;

const requireUser = o.middleware(({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      ...context,
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireUser);

const requireAdmin = o.middleware(({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  if (context.session.user.role !== "admin") {
    throw new ORPCError("FORBIDDEN");
  }

  return next({
    context: {
      ...context,
      session: context.session,
    },
  });
});

export const adminProcedure = publicProcedure.use(requireAdmin);
