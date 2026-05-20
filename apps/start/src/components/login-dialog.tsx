/** biome-ignore-all lint/style/noNestedTernary: <ignore> */
import { useAtom, useSetAtom } from "jotai";
import { SignInIcon } from "@phosphor-icons/react";

import { loginDialogAtom, pendingActionAtom } from "@/atoms/app";
import { resetLoginDialog } from "@/utils/login-dialog";

import { AuthLoginPanel } from "@/components/auth-login-panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";
import { useIsMobile } from "@/hooks/use-mobile";

interface LoginDialogProps {
  onOpenChange?: (open: boolean) => void;
  callbackUrl?: string;
  onlyGitHub?: boolean;
}

export const LoginDialog = ({ onOpenChange, callbackUrl, onlyGitHub }: LoginDialogProps) => {
  const [dialog, setDialog] = useAtom(loginDialogAtom);
  const setPendingAction = useSetAtom(pendingActionAtom);
  const {
    open: isOpen,
    onlyGithub: isGithubOnlyMode,
    callbackUrl: dialogCallbackUrl,
    description: customDescription,
    intent,
    title: customTitle,
  } = dialog;

  const isMobile = useIsMobile();

  const resolvedOnlyGitHub = onlyGitHub ?? isGithubOnlyMode;
  const resolvedCallbackUrl =
    callbackUrl ??
    dialogCallbackUrl ??
    (typeof window === "undefined"
      ? "/dashboard"
      : `${window.location.pathname}${window.location.search}${window.location.hash}`);

  const closeDialog = () => {
    setPendingAction(null);
    resetLoginDialog(setDialog);
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        onOpenChange?.(open);
        if (open) {
          setDialog((prev) => ({ ...prev, open: true }));
        } else {
          closeDialog();
        }
      }}
      open={isOpen}
    >
      <DialogTrigger
        render={
          <Button className="flex items-center gap-2" variant={isMobile ? "link" : "default"}>
            <SignInIcon />
            <span className="hidden md:block">{m.login_dialog_sign_in()}</span>
          </Button>
        }
      />
      <DialogContent className="p-0 sm:max-w-md">
        <AuthLoginPanel
          callbackUrl={resolvedCallbackUrl}
          description={customDescription}
          intent={intent}
          onlyGitHub={resolvedOnlyGitHub}
          onFooterLinkClick={closeDialog}
          title={customTitle}
        />
      </DialogContent>
    </Dialog>
  );
};
