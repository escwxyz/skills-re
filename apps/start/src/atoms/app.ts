import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export interface LoginDialogState {
  open: boolean;
  onlyGithub: boolean;
  title: string | null;
  description: string | null;
}

export const loginDialogAtom = atom<LoginDialogState>({
  open: false,
  onlyGithub: false,
  title: null,
  description: null,
});

export interface WriteReviewDialogState {
  open: boolean;
  initialStars: number;
  skillId: string | null;
}

export const writeReviewDialogAtom = atom<WriteReviewDialogState>({
  open: false,
  initialStars: 0,
  skillId: null,
});

export const isMobileMenuOpenAtom = atom(false);
export const isHeroSearchInViewAtom = atom(false);

export const skillsViewModeAtom = atomWithStorage<"grid" | "list">("skills-view-mode", "grid");
