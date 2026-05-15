import { isLoginDialogOpenAtom } from "@/atoms/app";
import { getSkillCheckSaved } from "@/functions/skills/get-skill-check-saved";
import { saveSkill } from "@/functions/skills/save-skill";
import { unsaveSkill } from "@/functions/skills/unsave-skill";
import { useAsyncDebouncer } from "@tanstack/react-pacer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";

const DEBOUNCE_MS = 600;

export const useSaveSkill = ({ slug }: { slug: string }) => {
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

  const toggleDebouncer = useAsyncDebouncer(
    async (target: boolean) => {
      try {
        await (target
          ? saveSkillMutation.mutateAsync({ slug })
          : unsaveSkillMutation.mutateAsync({ slug }));
      } catch {
        setOptimisticSaved(null);
        await queryClient.invalidateQueries({ queryKey: savedQueryKey });
      }
    },
    { wait: DEBOUNCE_MS },
    (state) => ({ isPending: state.isPending }),
  );

  // Clear optimistic state once query settles and no debounce is pending
  useEffect(() => {
    if (!toggleDebouncer.state.isPending) {
      setOptimisticSaved(null);
    }
  }, [savedData, toggleDebouncer.state.isPending]);

  const isSaved = optimisticSaved ?? savedData?.saved ?? false;

  const handleClick = () => {
    if (!currentUser) {
      setLoginDialogOpen(true);
      return;
    }

    const newState = !isSaved;
    setOptimisticSaved(newState);
    toggleDebouncer.maybeExecute(newState);
  };

  return {
    handleClick,
    isSaved,
  };
};
