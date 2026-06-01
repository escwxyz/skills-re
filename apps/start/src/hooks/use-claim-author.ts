import { loginDialogAtom, pendingActionAtom } from "@/atoms/app";
import { orpc } from "@/lib/orpc";
import { useMutation } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import { toast } from "sonner";
import { openLoginDialog } from "@/utils/login-dialog";

export const useClaimAuthor = ({ skillSlug }: { skillSlug: string }) => {
  const { currentUser } = useRouteContext({ from: "__root__" });

  const setLoginDialog = useSetAtom(loginDialogAtom);
  const setPendingAction = useSetAtom(pendingActionAtom);
  const claimAsAuthor = useMutation(orpc.skills.claimAsAuthor.mutationOptions({}));

  const handleClick = async () => {
    if (!currentUser) {
      setPendingAction({
        slug: skillSlug,
        type: "claim-author",
      });
      openLoginDialog(setLoginDialog, { onlyGithub: true });
      return;
    }

    await claimAsAuthor.mutateAsync(
      { slug: skillSlug },
      {
        onSuccess: () => {
          toast.success("Successfully claimed!");
        },
      },
    );
  };

  return {
    handleClick,
  };
};
