import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const isLoginDialogOpenAtom = atom(false);
export const loginDialogOnlyGithubAtom = atom(false);
export const isMobileMenuOpenAtom = atom(false);
export const isHeroSearchInViewAtom = atom(false);

export const skillsFiltersSidebarOpenAtom = atom(false);

export const skillsViewModeAtom = atomWithStorage<"grid" | "list">("skills-view-mode", "grid");

export interface MaybeAuthUser {
  id: string;
  name?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  github?: string | null;
  isVerified: boolean;
  email: string;
}

export interface MaybeAuthState {
  isAuthenticated: boolean;
  currentUser: MaybeAuthUser | null;
  updatedAt: number;
}

const DEFAULT_MAYBE_AUTH_STATE: MaybeAuthState = {
  currentUser: null,
  isAuthenticated: false,
  updatedAt: 0,
};

export const maybeAuthAtom = atomWithStorage<MaybeAuthState>(
  "maybe-auth",
  DEFAULT_MAYBE_AUTH_STATE,
);

export const isAuthenticatedAtom = atom((get) => get(maybeAuthAtom).isAuthenticated);

export const currentUserAtom = atom((get) => get(maybeAuthAtom).currentUser);
