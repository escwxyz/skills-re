import { implement, ORPCError } from "@orpc/server";
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

export const resolveApiUser = (
  context: Pick<Context, "apiKey" | "session">,
): { id: string; isAdmin: boolean } | null => {
  if (context.session?.user) {
    return {
      id: context.session.user.id,
      isAdmin: context.session.user.role === "admin",
    };
  }

  return context.apiKey?.userId
    ? {
        id: context.apiKey.userId,
        isAdmin: false,
      }
    : null;
};

const requireApiUser = o.middleware(({ context, next }) => {
  const apiUser = resolveApiUser(context);
  if (!apiUser) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      ...context,
      apiUser,
    },
  });
});

export const apiUserProcedure = publicProcedure.use(requireApiUser);

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
