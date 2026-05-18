import { loginDialogAtom } from "@/atoms/app";
import { orpc } from "@/lib/orpc";
import { useMutation } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import { toast } from "sonner";

export const useClaimAuthor = ({ skillSlug }: { skillSlug: string }) => {
  const { currentUser } = useRouteContext({ from: "__root__" });

  const setLoginDialog = useSetAtom(loginDialogAtom);
  const claimAsAuthor = useMutation(orpc.skills.claimAsAuthor.mutationOptions({}));

  const handleClick = async () => {
    if (!currentUser) {
      setLoginDialog((prev) => ({ ...prev, onlyGithub: true, open: true }));
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
