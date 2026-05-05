/** biome-ignore-all lint/style/noNestedTernary: <ignore> */
"use client";

import { useAtom } from "jotai";
import { useState } from "react";
import { SignInIcon } from "@phosphor-icons/react";

import { isLoginDialogOpenAtom, loginDialogOnlyGithubAtom } from "@/atoms/app";
import { authClient } from "@/lib/auth-client";

import { EmailOtpForm } from "@/components/email-otp-form";
import { SocialAuthButtons } from "@/components/social-auth-buttons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";
import { localizeHref } from "@/paraglide/runtime";

interface LoginDialogFooterProps {
  onLinkClick: () => void;
}

const LoginDialogFooter = ({ onLinkClick }: LoginDialogFooterProps) => (
  <div className="border-border/50 mt-6 border-t pt-4 text-center">
    <p className="text-muted-foreground text-[11px]">
      {m.login_dialog_by_signing_in_you_agree_to_our()}{" "}
      <a className="underline" onClick={onLinkClick} href={localizeHref("/terms")}>
        {m.login_dialog_terms()}
      </a>{" "}
      {m.login_dialog_and()}{" "}
      <a className="underline" onClick={onLinkClick} href={localizeHref("/privacy")}>
        {m.login_dialog_privacy_policy()}
      </a>
      .
    </p>
  </div>
);

interface LoginDialogProps {
  onOpenChange?: (open: boolean) => void;
  callbackUrl?: string;
  onlyGitHub?: boolean;
}

const LoginDialogContent = ({ onOpenChange, callbackUrl, onlyGitHub }: LoginDialogProps) => {
  const [isOpen, setIsOpen] = useAtom(isLoginDialogOpenAtom);
  const [isGithubOnlyMode, setGithubOnlyMode] = useAtom(loginDialogOnlyGithubAtom);
  const [view, setView] = useState<"options" | "email">("options");
  const resolvedOnlyGitHub = onlyGitHub ?? isGithubOnlyMode;

  const closeDialog = () => {
    setIsOpen(false);
  };

  const handleLogin = async (provider: "github" | "google") => {
    await authClient.signIn.social({
      callbackURL: callbackUrl,
      fetchOptions: {
        onSuccess: () => {
          window.location.href = localizeHref("/dashboard");
        },
      },
      provider,
    });
  };

  const resetEmailFlow = () => {
    setView("options");
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        onOpenChange?.(open);
        setIsOpen(open);
        if (!open) {
          resetEmailFlow();
          setGithubOnlyMode(false);
        }
      }}
      open={isOpen}
    >
      <DialogTrigger
        render={
          <Button className="text-primary-foreground hover:bg-primary flex cursor-pointer items-center gap-2">
            <SignInIcon />
            <span className="hidden md:block">{m.login_dialog_sign_in()}</span>
          </Button>
        }
      />
      <DialogContent className="p-6 sm:max-w-md">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-foreground text-center text-base font-semibold">
            {m.login_dialog_sign_in_to_continue()}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-center">
            {resolvedOnlyGitHub
              ? m.login_dialog_continue_with_github_to_verify()
              : m.login_dialog_choose_a_provider()}
          </DialogDescription>
        </DialogHeader>

        {view === "options" ? (
          <SocialAuthButtons
            onEmail={resolvedOnlyGitHub ? undefined : () => setView("email")}
            onlyGitHub={resolvedOnlyGitHub}
            onSocial={handleLogin}
          />
        ) : (
          <EmailOtpForm onBack={resetEmailFlow} />
        )}

        <LoginDialogFooter onLinkClick={closeDialog} />
      </DialogContent>
    </Dialog>
  );
};

export const LoginDialog = (props: LoginDialogProps) => <LoginDialogContent {...props} />;
