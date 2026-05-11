import { isLoginDialogOpenAtom, loginDialogOnlyGithubAtom } from "@/atoms/app";
import { orpc } from "@/lib/orpc";
import { useMutation } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { toast } from "sonner";

export const useClaimAuthor = ({ skillSlug }: { skillSlug: string }) => {
  const { currentUser } = useRouteContext({ from: "__root__" });

  const [, setLoginDialogOpen] = useAtom(isLoginDialogOpenAtom);
  const [, setLoginDialogOnlyGithub] = useAtom(loginDialogOnlyGithubAtom);
  const claimAsAuthor = useMutation(orpc.skills.claimAsAuthor.mutationOptions({}));

  const handleClick = async () => {
    if (!currentUser) {
      setLoginDialogOnlyGithub(true);
      setLoginDialogOpen(true);
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
