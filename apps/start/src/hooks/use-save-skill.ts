import { loginDialogAtom, pendingActionAtom } from "@/atoms/app";
import { getSkillCheckSaved } from "@/functions/skills/get-skill-check-saved";
import { saveSkill } from "@/functions/skills/save-skill";
import { unsaveSkill } from "@/functions/skills/unsave-skill";
import { orpc } from "@/lib/orpc";
import { openLoginDialog } from "@/utils/login-dialog";
import { useAsyncDebouncer } from "@tanstack/react-pacer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { useGoogleAnalytics } from "tanstack-router-ga4";

const DEBOUNCE_MS = 600;

export const useSaveSkill = ({ slug }: { slug: string }) => {
  const { currentUser } = useRouteContext({ from: "__root__" });
  const ga = useGoogleAnalytics();
  const queryClient = useQueryClient();
  const getSavedStatus = useServerFn(getSkillCheckSaved);
  const saveSkillFn = useServerFn(saveSkill);
  const unsaveSkillFn = useServerFn(unsaveSkill);

  const setLoginDialog = useSetAtom(loginDialogAtom);
  const setPendingAction = useSetAtom(pendingActionAtom);
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
  const saveToCollectionMutation = useMutation(
    orpc.collections.saveSkill.mutationOptions({
      onSuccess: () => {
        queryClient.setQueryData(savedQueryKey, { saved: true });
      },
    }),
  );

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
      setPendingAction({
        slug,
        type: "save-skill",
      });
      openLoginDialog(setLoginDialog);
      return;
    }

    const newState = !isSaved;
    ga.event(newState ? "save_skill" : "unsave_skill", { slug });
    setOptimisticSaved(newState);
    toggleDebouncer.maybeExecute(newState);
  };

  const saveToCollection = async (input: {
    collectionId?: string;
    newCollection?: {
      description?: string;
      slug?: string;
      title: string;
      visibility?: "public" | "private";
    };
    visibility?: "public" | "private";
  }) => {
    if (!currentUser) {
      setPendingAction({
        slug,
        type: "save-skill",
      });
      openLoginDialog(setLoginDialog);
      return;
    }

    ga.event("save_skill_to_collection", { slug });
    setOptimisticSaved(true);
    try {
      await saveToCollectionMutation.mutateAsync({
        ...input,
        skillSlug: slug,
      });
      await queryClient.invalidateQueries({ queryKey: savedQueryKey });
    } catch (error) {
      setOptimisticSaved(false);
      throw error;
    }
  };

  return {
    handleClick,
    isSaved,
    isSavingToCollection: saveToCollectionMutation.isPending,
    saveToCollection,
  };
};
