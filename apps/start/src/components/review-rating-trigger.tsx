import { useSetAtom } from "jotai";
import { useRouteContext } from "@tanstack/react-router";

import { loginDialogAtom, writeReviewDialogAtom } from "@/atoms/app";
import { Rating, RatingItem } from "@/components/ui/rating/rating";

interface ReviewRatingTriggerProps {
  skillId: string;
}

export function ReviewRatingTrigger({ skillId }: ReviewRatingTriggerProps) {
  const { currentUser } = useRouteContext({ from: "__root__" });
  const setWriteReviewDialog = useSetAtom(writeReviewDialogAtom);
  const setLoginDialog = useSetAtom(loginDialogAtom);

  const handleValueChange = (value: number) => {
    if (currentUser) {
      setWriteReviewDialog({ open: true, initialStars: value, skillId });
      return;
    }

    setLoginDialog((prev) => ({ ...prev, open: true }));
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
