import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { isLoginDialogOpenAtom } from "@/atoms/app";
import { useRouteContext } from "@tanstack/react-router";
import { BookmarkSimpleIcon } from "@phosphor-icons/react";
import { m } from "@/paraglide/messages";
import { getSkillCheckSaved } from "@/functions/skills/get-skill-check-saved";
import { saveSkill } from "@/functions/skills/save-skill";
import { unsaveSkill } from "@/functions/skills/unsave-skill";

interface Props {
  slug: string;
}

const DEBOUNCE_MS = 600;

export const SaveSkillButton = ({ slug }: Props) => {
  const { currentUser } = useRouteContext({ from: "__root__" });
  const queryClient = useQueryClient();
  const getSavedStatus = useServerFn(getSkillCheckSaved);
  const saveSkillFn = useServerFn(saveSkill);
  const unsaveSkillFn = useServerFn(unsaveSkill);

  const [, setLoginDialogOpen] = useAtom(isLoginDialogOpenAtom);
  const savedQueryKey = ["skillCheckSaved", slug] as const;

  const { data: savedData } = useQuery({
    queryKey: savedQueryKey,
    queryFn: () => getSavedStatus({ data: { slug } }),
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

  const saveSkillMutation = useMutation({
    mutationFn: (input: { slug: string }) => saveSkillFn({ data: input }),
    onSuccess: () => {
      queryClient.setQueryData(savedQueryKey, { saved: true });
    },
  });
  const unsaveSkillMutation = useMutation({
    mutationFn: (input: { slug: string }) => unsaveSkillFn({ data: input }),
    onSuccess: () => {
      queryClient.setQueryData(savedQueryKey, { saved: false });
    },
  });

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
        await (target
          ? saveSkillMutation.mutateAsync({ slug })
          : unsaveSkillMutation.mutateAsync({ slug }));
      } catch {
        // Revert optimistic state on failure
        setOptimisticSaved(null);
        await queryClient.invalidateQueries({
          queryKey: savedQueryKey,
        });
      }
    }, DEBOUNCE_MS);
  };

  return (
    <Button onClick={handleClick} size="lg">
      <BookmarkSimpleIcon className="size-4" weight={isSaved ? "fill" : "regular"} />
      {isSaved ? m.skill_actions_saved_skill() : m.skill_actions_save_skill()}
    </Button>
  );
};
