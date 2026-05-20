import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

export type LoginIntent = "continue" | "dashboard";

export type PendingAction =
  | {
      type: "save-skill";
      slug: string;
    }
  | {
      type: "claim-author";
      slug: string;
    }
  | {
      initialStars?: number;
      skillId: string;
      type: "write-review";
    };

export interface LoginDialogState {
  open: boolean;
  onlyGithub?: boolean;
  title?: string | null;
  description?: string | null;
  callbackUrl?: string;
  intent?: LoginIntent;
}

export const loginDialogAtom = atom<LoginDialogState>({
  open: false,
  onlyGithub: false,
  title: null,
  description: null,
  callbackUrl: undefined,
  intent: "continue",
});

const pendingActionStorage = createJSONStorage<PendingAction | null>(() => sessionStorage);

export const pendingActionAtom = atomWithStorage<PendingAction | null>(
  "pending-action",
  null,
  pendingActionStorage,
);

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
