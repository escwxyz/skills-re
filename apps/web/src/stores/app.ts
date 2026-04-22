import { atom, computed } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";

export const isLoginDialogOpenAtom = atom(false);
export const loginDialogOnlyGithubAtom = atom(false);
export const isMobileMenuOpenAtom = atom(false);
export const isHeroSearchInViewAtom = atom(false);

export const skillsFiltersSidebarOpenAtom = atom(false);

export const skillsViewModeAtom = persistentAtom<"grid" | "list">("skills-view-mode", "grid", {
  encode: JSON.stringify,
  decode: JSON.parse,
});

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

export const maybeAuthAtom = persistentAtom<MaybeAuthState>(
  "maybe-auth",
  DEFAULT_MAYBE_AUTH_STATE,
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  },
);

export const isAuthenticatedAtom = computed(maybeAuthAtom, (state) => state.isAuthenticated);

export const currentUserAtom = computed(maybeAuthAtom, (state) => state.currentUser);
