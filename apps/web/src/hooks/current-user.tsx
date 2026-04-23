"use client";

import { authClient } from "@/lib/auth-client";
import { useStore } from "@nanostores/react";

export const useCurrentUser = () => {
  const { useSession: sessionAtom } = authClient;

  const { data: sessionData } = useStore(sessionAtom);

  const sessionUser = sessionData?.user;

  const currentUser = sessionUser
    ? {
        avatarUrl: sessionUser.image,
        email: sessionUser.email,
        name: sessionUser.name,
      }
    : null;

  return currentUser;
};
