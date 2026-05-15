import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const isLoginDialogOpenAtom = atom(false);
export const loginDialogOnlyGithubAtom = atom(false);
export const isWriteReviewDialogOpenAtom = atom(false);
export const writeReviewInitialStarsAtom = atom(0);
export const writeReviewSkillIdAtom = atom<string | null>(null);
export const isMobileMenuOpenAtom = atom(false);
export const isHeroSearchInViewAtom = atom(false);

export const skillsViewModeAtom = atomWithStorage<"grid" | "list">("skills-view-mode", "grid");
