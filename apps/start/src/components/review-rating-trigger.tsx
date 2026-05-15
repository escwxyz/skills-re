import { useSetAtom } from "jotai";
import { useRouteContext } from "@tanstack/react-router";

import {
  isLoginDialogOpenAtom,
  isWriteReviewDialogOpenAtom,
  writeReviewInitialStarsAtom,
  writeReviewSkillIdAtom,
} from "@/atoms/app";
import { Rating, RatingItem } from "@/components/ui/rating/rating";

interface ReviewRatingTriggerProps {
  skillId: string;
}

export function ReviewRatingTrigger({ skillId }: ReviewRatingTriggerProps) {
  const { currentUser } = useRouteContext({ from: "__root__" });
  const setLoginDialogOpen = useSetAtom(isLoginDialogOpenAtom);
  const setOpen = useSetAtom(isWriteReviewDialogOpenAtom);
  const setInitialStars = useSetAtom(writeReviewInitialStarsAtom);
  const setSkillId = useSetAtom(writeReviewSkillIdAtom);

  const handleValueChange = (value: number) => {
    setSkillId(skillId);
    setInitialStars(value);

    if (currentUser) {
      setOpen(true);
      return;
    }

    setLoginDialogOpen(true);
  };

  return (
    <div aria-label="write review rating" className="shrink-0">
      <Rating defaultValue={0} onValueChange={handleValueChange}>
        {Array.from({ length: 5 }, (_, index) => (
          <RatingItem key={index} />
        ))}
      </Rating>
    </div>
  );
}
