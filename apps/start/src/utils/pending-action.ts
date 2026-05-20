import type { PendingAction } from "@/atoms/app";

export interface PendingActionExecutor {
  claimAuthor: (slug: string) => Promise<unknown>;
  saveSkill: (slug: string) => Promise<unknown>;
  openWriteReview: (input: { initialStars?: number; skillId: string }) => Promise<unknown>;
}

export async function executePendingAction(action: PendingAction, executor: PendingActionExecutor) {
  if (action.type === "save-skill") {
    return await executor.saveSkill(action.slug);
  }

  if (action.type === "claim-author") {
    return await executor.claimAuthor(action.slug);
  }

  if (action.type === "write-review") {
    return await executor.openWriteReview({
      initialStars: action.initialStars,
      skillId: action.skillId,
    });
  }

  return null;
}
