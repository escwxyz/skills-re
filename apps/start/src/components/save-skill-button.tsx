import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { isLoginDialogOpenAtom } from "@/atoms/app";
import { orpc } from "@/lib/orpc";
import { useRouteContext } from "@tanstack/react-router";
import { BookmarkSimpleIcon } from "@phosphor-icons/react";
import { m } from "@/paraglide/messages";

interface Props {
  slug: string;
}

const DEBOUNCE_MS = 600;

export const SaveSkillButton = ({ slug }: Props) => {
  const { currentUser } = useRouteContext({ from: "__root__" });
  const queryClient = useQueryClient();

  const [, setLoginDialogOpen] = useAtom(isLoginDialogOpenAtom);

  const { data: savedData } = useQuery({
    ...orpc.skills.checkSaved.queryOptions({ input: { slug } }),
    enabled: !!currentUser,
  });

  // null means "no pending change — use server state"
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);
  const pendingTargetRef = useRef<boolean | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear optimistic state once query settles after a mutation
  useEffect(() => {
    if (pendingTargetRef.current === null) {
      setOptimisticSaved(null);
    }
  }, [savedData]);

  const saveSkill = useMutation(orpc.skills.save.mutationOptions({}));
  const unsaveSkill = useMutation(orpc.skills.unsave.mutationOptions({}));

  const isSaved = optimisticSaved ?? savedData?.saved ?? false;

  const handleClick = () => {
    if (!currentUser) {
      setLoginDialogOpen(true);
      return;
    }

    const newState = !isSaved;
    setOptimisticSaved(newState);
    pendingTargetRef.current = newState;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const target = pendingTargetRef.current;
      pendingTargetRef.current = null;

      try {
        await (target ? saveSkill.mutateAsync({ slug }) : unsaveSkill.mutateAsync({ slug }));
      } catch {
        // Revert optimistic state on failure
        setOptimisticSaved(null);
        await queryClient.invalidateQueries({
          queryKey: orpc.skills.checkSaved.key({ input: { slug } }),
        });
      }
    }, DEBOUNCE_MS);
  };

  return (
    <Button onClick={handleClick} className="justify-between items-center" variant="default">
      <BookmarkSimpleIcon className="size-4" weight={isSaved ? "fill" : "regular"} />
      {isSaved ? m.skill_actions_saved_skill() : m.skill_actions_save_skill()}
    </Button>
  );
};
