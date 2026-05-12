import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const isLoginDialogOpenAtom = atom(false);
export const loginDialogOnlyGithubAtom = atom(false);
export const isMobileMenuOpenAtom = atom(false);
export const isHeroSearchInViewAtom = atom(false);

export const skillsViewModeAtom = atomWithStorage<"grid" | "list">("skills-view-mode", "grid");
