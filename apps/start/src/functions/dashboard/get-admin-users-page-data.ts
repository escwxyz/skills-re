import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { authClient } from "@/lib/auth-client";
import { authMiddleware } from "@/middlewares/auth";
import { adminMiddleware } from "@/middlewares/admin";

const fetchAdminUsers = async () => {
  const incomingHeaders = getRequestHeaders();
  const cookie = incomingHeaders.get("cookie");

  const result = await authClient.admin.listUsers({
    query: { limit: 20 },
    fetchOptions: {
      headers: cookie ? { cookie } : undefined,
    },
  });

  if (result.error) {
    throw new Error(result.error.message || "Failed to fetch users");
  }

  return result.data;
};

export type AdminUsersPageData = NonNullable<Awaited<ReturnType<typeof fetchAdminUsers>>>;

export const getAdminUsersPageData = createServerFn({ method: "GET" })
  .middleware([authMiddleware, adminMiddleware])
  .handler(() => fetchAdminUsers());
